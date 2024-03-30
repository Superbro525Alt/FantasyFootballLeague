"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Team } from "@/lib/types";
import { Input } from "@/components/ui/input";

const abbreviations = {
  "GM": "Games played",
  "KI": "Kicks",
  "MK": "Marks",
  "HB": "Handballs",
  "DI": "Disposals",
  "DA": "Disposal average",
  "GL": "Goals",
  "BH": "Behinds",
  "HO": "Hit outs",
  "TK": "Tackles",
  "RB": "Rebound 50s",
  "IF": "Inside 50s",
  "CL": "Clearances",
  "CG": "Clangers",
  "FF": "Free kicks for",
  "FA": "Free kicks against",
  "BR": "Brownlow votes",
  "CP": "Contested possessions",
  "UP": "Uncontested possessions",
  "CM": "Contested marks",
  "MI": "Marks inside 50",
  "1%": "One percenters",
  "BO": "Bounces",
  "GA": "Goal assist",
  "%P": "Percentage of game played",
  "SU": "Sub (On/Off)"
};

function TeamData(props: any) {
  // const { name, retirement, abbrev, debut, id, logo, data } = props;
  return (
    <DialogContent className="min-w-[80vw] min-h-[80vh] max-h-[80vh] popup overflow-scroll overflow-y-scroll max-h-screen">
      <DialogHeader>
        <DialogTitle>{props.name}</DialogTitle>
        <DialogDescription className="flex flex-col gap-5 overflow-scroll">
          Team Info
        </DialogDescription>
        </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Retirement</TableHead>
                <TableHead>Abbrev</TableHead>
                <TableHead>Debut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{props.data.name}</TableCell>
                <TableCell>{props.data.retirement != 9999 ? props.data.retirement : "N/A"}</TableCell>
                <TableCell>{props.data.abbrev}</TableCell>
                <TableCell>{props.data.debut}</TableCell>
              </TableRow>
              </TableBody>
              </Table>

              <Table className="overflow-scroll">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
{props.data.data && (
    Object.entries(props.data.data).splice(3).map(([key, value]) => (
        (value && value[(Object.keys(value).length-1).toString()] != null) && (
            <TableRow key={key}>
                <TableCell>{abbreviations[key]}</TableCell>
                <TableCell>{value[(Object.keys(value).length-1).toString()]}</TableCell>
            </TableRow>
        )
    ))
)}
                </TableBody>
                </Table>
    </DialogContent>
  )
}

function PlayersData(props: any) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter players based on the search query
  const filteredPlayers = Object.entries(props.data || {})
    .filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <DialogContent className="min-w-[80vw] min-h-[80vh] max-h-[80vh] popup overflow-scroll overflow-y-scroll">
      <DialogHeader>
        <DialogTitle>Players - {props.name}</DialogTitle>
        <DialogDescription></DialogDescription>
      </DialogHeader>

      <div className="min-w-[100%] max-w-sm flex flex-col items-center gap-3">
        <Label htmlFor="player_search" className="w-full">Search Players</Label>
      <Input
        // label="Search Players"
        id="player_search"
        placeholder="Enter player name"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-[100%]"
      />
      </div>

      <Accordion type="single" collapsible className="w-full items-start justify-start">
        {filteredPlayers.map(([name, data]) => (
          <AccordionItem value={name} key={name}>
            <AccordionTrigger>{name}</AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stat</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.season_stats_total).splice(3).map(([key, value]) => (
                    (abbreviations[key] != null && (
                    <TableRow key={key}>
                      <TableCell>{abbreviations[key]}</TableCell>
                      <TableCell>{value[(Object.keys(value).length - 1).toString()] != null ? value[(Object.keys(value).length - 1).toString()] : "N/A"}</TableCell>
                    </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </DialogContent>
  );
};

export default function Home() {
  const apiserver = "http://127.0.0.1:5000/"
  var defaultteams: Team[] = [];
  const [teams, setTeams] = useState(defaultteams);
  const [canFetch, setCanFetch] = useState(true);
  
  async function GetTeamData() {
    if (!canFetch) { return; }
    fetch("https://api.squiggle.com.au/?q=teams").then((data) => {
      // console.log(data)
      data.json().then(async (json) => {
        let tempteams: Team[] = json["teams"];
        for (let i = 0; i < tempteams.length; i++) {
          let headers = new Headers();
          headers.append('Access-Control-Allow-Origin', 'http://localhost:3000');
          headers.append('Access-Control-Allow-Credentials', 'true');
          await fetch(apiserver + "team?" + new URLSearchParams({
            team: tempteams[i].name
          }), {
              // mode: 'no-cors'
              headers: headers
            }).then((resp) => {
            console.log(resp)
              // console.log(resp.text())
            resp.json().then((teamdata) => {
              // console.log(teamdata)
              tempteams[i].players = teamdata["players"]; 
              tempteams[i].data = teamdata["stats"];
            })
          })
        }
        console.log(tempteams)
        setTeams(tempteams)
      })
    });
  }

  if (canFetch) {
    setCanFetch(false);
    GetTeamData();
    setTimeout(() => {
      setCanFetch(true);
    }, 10000)
  }

  return (
      <Card className="min-h-[90vh] min-w-[100%] p-4 grid-teams gap-5">
        {teams.map((team) => (
          <Card key={teams.indexOf(team)} className="flex flex-col gap-5 p-3 text-center team max-h-[25vh]">
            <CardTitle className="text-base">
              <div className="flex flex-row justify-center items-center gap-5">
                <Avatar> 
                  <AvatarImage src={"https://squiggle.com.au" + team.logo} alt={team.abbrev}/>
                  <AvatarFallback>{team.abbrev}</AvatarFallback>
                </Avatar>
                {team.name}
              </div>
            </CardTitle>
            <CardContent className="team-buttons">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Overall Stats</Button>
              </DialogTrigger>
              <TeamData name={team.name} data={team}/>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Players</Button>
                </DialogTrigger>
                <PlayersData name={team.name} data={team.players}/>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </Card>
  );
}
