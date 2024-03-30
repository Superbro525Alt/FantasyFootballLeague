import json
import os
from datetime import datetime
from os.path import isfile
import threading
from time import time

import numpy as np
import pandas as pd
import requests
import rpy2.robjects.packages as packages
from flask import Flask, jsonify, render_template, request, json as flaskjson
from flask_restful import Api
from rpy2.rinterface_lib.sexp import NACharacterType
from rpy2.robjects.vectors import DataFrame as rdf
from rpy2.robjects import conversion, default_converter

from pyAFL.teams import CURRENT_TEAMS
from pyAFL.teams.models import Team
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Flask, make_response, request, current_app
from datetime import timedelta
from functools import update_wrapper

from urllib3.response import basestring
from flask_cors import CORS

app = Flask(__name__)
api = Api(app)
CORS(app)

def crossdomain(origin=None, methods=None, headers=None,
                max_age=21600, attach_to_all=True,
                automatic_options=True):
    if methods is not None:
        methods = ', '.join(sorted(x.upper() for x in methods))
    if headers is not None and not isinstance(headers, basestring):
        headers = ', '.join(x.upper() for x in headers)
    if not isinstance(origin, basestring):
        origin = ', '.join(origin)
    if isinstance(max_age, timedelta):
        max_age = max_age.total_seconds()

    def get_methods():
        if methods is not None:
            return methods

        options_resp = current_app.make_default_options_response()
        return options_resp.headers['allow']

    def decorator(f):
        def wrapped_function(*args, **kwargs):
            if automatic_options and request.method == 'OPTIONS':
                resp = current_app.make_default_options_response()
            else:
                resp = make_response(f(*args, **kwargs))
            if not attach_to_all and request.method != 'OPTIONS':
                return resp

            h = resp.headers

            h['Access-Control-Allow-Origin'] = origin
            h['Access-Control-Allow-Methods'] = get_methods()
            h['Access-Control-Max-Age'] = str(max_age)
            if headers is not None:
                h['Access-Control-Allow-Headers'] = headers
            return resp

        f.provide_automatic_options = False
        return update_wrapper(wrapped_function, f)
    return decorator

class MyEncoder(json.JSONEncoder):
    """
    custom JSON encoder. Converts certain datatypes to valid JSON.
    """
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, NACharacterType):
            obj = None
            return obj
        elif isinstance(obj, pd.DataFrame):
            pass
        elif isinstance(obj, rdf):
            df_obj = pd.DataFrame.from_dict({key: np.asarray(obj.rx2(key)) for key in obj.names}, orient='index')
            df_obj = df_obj.T
            df_obj = df_obj.to_dict()
            return df_obj
        else:
            return super(MyEncoder, self).default(obj)


class RPackageDependencies:
    """
    This class handles the install and/or import of the most up-to-date
    R package we use with this API.
    """

    def __init__(self, r_package):
        self.r_package = r_package
        # with conversion.localconverter(default_converter):
        utils = packages.importr('utils')
        utils.chooseCRANmirror(ind=1)
        # self.source_package = self.import_source_package(r_package)
        self.source_package = None
        self.package_import = self.import_source_package(self.r_package)

    def import_source_package(self, package_name):
        """
        Install and/or import the most up-to-date source package.
        """
        if packages.isinstalled(package_name):
            self.source_package = packages.importr(package_name)
            if self.check_latest_release_version(package_name):
                return self.source_package
            else:
                self.install_package(package_name)

    def install_package(self, package_name):
        """
        Installs the source package using the R utils package.
        """
        utils = packages.importr('utils')
        utils.chooseCRANmirror(ind=1)
        utils.install_packages(package_name)
        self.source_package = packages.importr(package_name)
        return self.source_package

    def check_latest_release_version(self, package):
        """
        check if imported source package is latest available version.
        """
        utils = packages.importr('utils')
        installed_package = self.extract_version(utils.installed_packages())
        available_package = self.extract_version(utils.available_packages())
        is_latest_version = installed_package[package] == available_package[package]
        return is_latest_version

    def extract_version(self, package_data):
        """
        Get package and version column.
        """
        return dict(zip(package_data.rx(True, 'Package'), package_data.rx(True, 'Version')))


class InvalidSource(Exception):
    """
    Validation for input source.
    """
    def __init__(self, input_source, valid_sources):
        self.input_source = input_source
        self.invalid_source_message = f"""
            '{self.input_source}' is an invalid data source. Please select one of the following:
            {valid_sources}.
        """
        super().__init__(self.invalid_source_message)


class NoCompetitionData(Exception):
    """
    Validation for competition.
    """
    def __init__(self, input_competition, valid_competitions):
        self.input_competition = input_competition
        self.invalid_source_message = f"""
            '{self.input_competition}' is an invalid data source. Please select one of the following:
            {valid_competitions}.
        """
        super().__init__(self.invalid_source_message)


class InvalidRoundNumber(Exception):
    """
    Validation for round_number.
    """
    def __init__(self, input_round_number):
        self.input_round_number = input_round_number
        self.invalid_source_message = f"""
            '{self.input_round_number}' is an invalid round_number. Please enter a valid number."""
        super().__init__(self.invalid_source_message)


class InvalidSeason(Exception):
    """
    Validation for season.
    """
    def __init__(self, input_season):
        self.input_season = input_season
        self.invalid_source_message = f"""
            '{self.input_season}' is an invalid season. Please enter a valid number."""
        super().__init__(self.invalid_source_message)


@app.route('/')
def get_root():
    print('sending root')
    return render_template('index.html')


@app.route('/api/docs')
def get_api_docs():
    print('sending docs')
    return render_template('swaggerui.html')


@app.route('/fixture', methods=['GET'])
def fixture():

    r_package = packages.importr('fitzRoy')

    season = request.args.get('season', default=datetime.now().year, type=int)
    round_number = request.args.get('round_number', default=1)
    source = request.args.get('source', default='AFL', type=str)
    competition = request.args.get('competition', default='AFLM', type=str)

    # round_number input validation
    if source != 'AFL' and round_number == '':
        # TODO Improvement: If round_number is an empty string return all rounds
        round_number = 1

    # competition input validation
    valid_competitions = ('AFLM', 'AFLW',)
    if source != 'AFL':
        valid_competitions = ('AFLM',)
    if competition.upper() not in valid_competitions:
        raise NoCompetitionData(competition, valid_competitions)

    response = r_package.fetch_fixture(season=season, round_number=round_number, source=source, comp=competition)

    fixture = pd.DataFrame.from_dict({key: np.asarray(response.rx2(key), dtype=object) for key in response.names}, orient='index')

    fixture = fixture.T

    fixture = fixture.to_dict()

    fixture = json.dumps(fixture, cls=MyEncoder)

    return fixture


@app.route('/ladder', methods=['GET'])
def ladder():

    r_package = packages.importr('fitzRoy')

    season = request.args.get('season', default=datetime.now().year, type=int)
    round_number = request.args.get('round_number', default=1, type=int)
    source = request.args.get('source', default='AFL', type=str)
    competition = request.args.get('competition', default='AFLM', type=str)

    # competition input validation
    valid_competitions = ('AFLM', 'AFLW')
    if source not in ('AFL', 'fryzigg',):
        valid_competitions = ('AFLM',)
    if competition.upper() not in valid_competitions:
        raise NoCompetitionData(competition, valid_competitions)

    # season input validation
    if not isinstance(season, int):
        try:
            season = int(season)
        except:
            raise InvalidSeason(season)

    # round_number input validation
    if not isinstance(round_number, int):
        try:
            round_number = int(round_number)
        except:
            raise InvalidRoundNumber(round_number)

    # source input validation
    valid_sources = ('AFL', 'squiggle', 'afltables')
    if source not in valid_sources:
        raise InvalidSource(source, valid_sources)

    response = r_package.fetch_ladder(season=season, source=source, round_number=round_number, comp=competition)

    ladder = pd.DataFrame.from_dict({key: np.asarray(response.rx2(key)) for key in response.names}, orient='index')

    ladder = ladder.T

    ladder = ladder.to_dict()

    ladder = json.dumps(ladder, cls=MyEncoder)

    return ladder


@app.route('/lineup', methods=['GET'])
def lineup():

    r_package = packages.importr('fitzRoy')

    season = request.args.get('season', default=datetime.now().year, type=int)
    round_number = request.args.get('round_number', default=1, type=int)
    competition = request.args.get('competition', default='AFLM', type=str)

    response = r_package.fetch_lineup(season=season, round_number=round_number, comp=competition)

    lineup = pd.DataFrame.from_dict({key: np.asarray(response.rx2(key)) for key in response.names}, orient='index')

    lineup = lineup.T

    lineup = lineup.to_dict()

    lineup = json.dumps(lineup, cls=MyEncoder)

    return lineup


@app.route('/player_details', methods=['GET'])
def player_details():

    r_package = packages.importr('fitzRoy')

    source = request.args.get('source', default='AFL', type=str)
    current = request.args.get('current', default=True, type=bool)
    team = request.args.get('team', default='', type=str)

    response = r_package.fetch_player_details(team=team, current=current, source=source)

    player_details = pd.DataFrame.from_dict({key: np.asarray(response.rx2(key)) for key in response.names}, orient='index')

    player_details = player_details.T

    player_details = player_details.to_dict()

    player_details = json.dumps(player_details, cls=MyEncoder).replace("NaN", "null")

    return player_details


@app.route('/player_statistics', methods=['GET'])
def player_stats():

    r_package = packages.importr('fitzRoy')

    season = request.args.get('season', default=datetime.now().year, type=int)
    round_number = request.args.get('round_number', default='')
    source = request.args.get('source', default='AFL', type=str)

    # season input validation
    if not isinstance(season, int):
        try:
            season = int(season)
        except:
            raise InvalidSeason(season)

    # source input validation
    valid_sources = ('AFL', 'footywire', 'fryzigg', 'afltables')
    if source not in valid_sources:
        raise InvalidSource(source, valid_sources)

    if source.upper() not in ('AFL', 'AFLM') and round_number:
        print('''round_number is currently only supported with the 'AFL' source.
                 Returning data for all rounds in specified season.''')

    response = r_package.fetch_player_stats(season=season, source=source, round_number=round_number)

    player_stats = pd.DataFrame.from_dict({key: np.asarray(response.rx2(key)) for key in response.names}, orient='index')

    player_stats = player_stats.T

    player_stats = player_stats.to_dict()

    player_stats = json.dumps(player_stats, cls=MyEncoder)

    return player_stats


@app.route('/results', methods=['GET'])
def results():
    
    r_package = RPackageDependencies('fitzRoy')

    round_number = request.args.get('round_number', default=1, type=int)
    season = request.args.get('season', default=datetime.now().year, type=int)
    source = request.args.get('source', default='AFL', type=str)
    competition = request.args.get('competition', default='AFLM', type=str)

    if not isinstance(season, int):
        try:
            season = int(season)
        except:
            raise InvalidSeason(season)

    if not isinstance(round_number, int):
        try:
            round_number = int(round_number)
        except:
            raise InvalidRoundNumber(round_number)

    # source input validation
    valid_sources = ('footywire', 'fryzigg', 'afltables', 'AFL')
    if source not in valid_sources:
        raise InvalidSource(source, valid_sources)

    response = r_package.source_package.fetch_results(season=season, round_number=round_number, comp=competition)

    results = pd.DataFrame.from_dict({key: np.asarray(response.rx2(key)) for key in response.names}, orient='index')

    results = results.T

    results = results.to_dict()

    results = json.dumps(results, cls=MyEncoder)

    return results

@app.route("/team", methods=["GET"])
def teams():
    team = request.args.get("team", "", str)
    forceReload = request.args.get("forceReload", False, bool)
    return get_team(team, forceReload)

def get_team(team, forceReload):
    # team = request.args.get("team", "", str)
    # forceReload = request.args.get("forceReload", False, bool)
    # print(request.args)
    # print(forceReload)

    cacheExists = os.path.isfile(f".cache/teams/{team}/data.json")
    # print(cacheExists and not forceReload)

    if cacheExists and not forceReload:
        with open(f".cache/teams/{team}/data.json") as file:
            return file.read()

    # print(team)

    if team == "":
        raise Exception("Invalid team")

    for _team in CURRENT_TEAMS:
        if team == _team.name:
            print(team)
            ret = {"stats": None, "players": {}}

            def get_team_data(team_data):
                ret["stats"] = team_data.season_stats(2024).to_dict()

            def get_player_data(player):
                player_data = player.get_player_stats().__dict__.items()
                player_dict = {
                    stat: data.to_dict()
                    for stat, data in player_data
                    if not isinstance(data, list)
                }
                ret["players"][player.name] = player_dict

            starttime = time()

            # Fetch team data and player data using ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=2500) as executor:
                # Submit tasks for fetching team data and player data
                team_future = executor.submit(get_team_data, _team)
                player_futures = [executor.submit(get_player_data, player) for player in _team.players]

                # Wait for team data and all player data retrieval to complete
                team_future.result()
                
                for future in as_completed(player_futures):
                    future.result()

            print("Final Time:", time() - starttime)
             
            # retstr = json.dumps(ret)

            # retstr = retstr.replace("NaN", "None")

            final = flaskjson.dumps(ret).replace("NaN", "null")

            if not os.path.exists(f".cache/teams/{team}"):
                os.mkdir(f".cache/teams/{team}")

            with open(f".cache/teams/{team}/data.json", "w") as file:
                file.write(final)

            return final
    

    return "None"

# @app.route("/setup", methods=["GET"])
def setup():
    # with ThreadPoolExecutor(max_workers=200) as executor:
    [get_team(team.name, True) for team in CURRENT_TEAMS if not os.path.exists(f".cache/teams/{team.name}")]

        # for future in as_completed(futures):
            # future.result()
        

    return "Success"

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host = '0.0.0.0', port = port)
    # setup()
