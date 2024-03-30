"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Team } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import Link from "next/link";

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

export default function Players() {
  const apiserver = "http://127.0.0.1:5000/";
  var defaultteams: Team[] = [];
  var defaultselectedplayers: {[key: string]: string | object}[] = [];
  const [teams, setTeams] = useState(defaultteams);
  const [canFetch, setCanFetch] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState(defaultselectedplayers)
  
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
        setTeams(tempteams)
        console.log(tempteams)
        let tempselectedplayers = [
          { name: "Warhurst, Tom", team: "Adelaide", stats: {} },
          { name: "Hinge, John", team: "Adelaide", stats: {} },
          { name: "Lamb, Clayton", team: "Adelaide", stats: {} },
          { name: "Stevens, Linden", team: "Adelaide", stats: {} },
          { name: "Smith, Jason", team: "Richmond", stats: {} },
          { name: "Brine, David", team: "Collingwood", stats: {} },
          { name: "Williams, Shane", team: "Geelong", stats: {} },
          { name: "Brown, Jonathan", team: "Brisbane Lions", stats: {} },
          { name: "Taylor, Lewis", team: "Sydney", stats: {} },
          { name: "Burton, Ryan", team: "Port Adelaide", stats: {} },
          { name: "Thompson, Mark", team: "Essendon", stats: {} },
          { name: "Martin, Dustin", team: "Richmond", stats: {} },
          { name: "Robinson, Mitch", team: "Brisbane Lions", stats: {} },
          { name: "Kennedy, Josh", team: "West Coast", stats: {} }
        ]
        for (let player of tempselectedplayers) {
          let data = await fetch(apiserver+`player_details?team=${player.team}&source=afltables`)
          let json = await data.json()
          
          let name = player.name.replace(",", "").split(" ").reverse().toString().replace(",", " ")
        
          let index = Object.values(json.Player).indexOf(name)
          
          
          player.stats["weight"] = json.WT[index]
          player.stats["height"] = json.HT[index]
          player.stats["seasons"] = json.Seasons[index]

          console.log(player)
        }

        setSelectedPlayers(tempselectedplayers)
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
      {selectedPlayers.map((player: {[key: string]: string | object}) => (
        <Card className="flex flex-col gap-5 justify-center items-center">
          {player.name}
          <div className="text-sm flex flex-row gap-5">
            <Label>{player.stats["weight"]}</Label>
            <Label>{player.stats["height"]}</Label>
          </div>
          <Label>Played: {player.stats["seasons"]}</Label>
          <div className="flex flex-row gap-4 justify-center items-center">
            <Avatar>
              <AvatarImage src={"https://squiggle.com.au" + teams.find(obj => obj.name == player.team).logo}/>
              <AvatarFallback>
                {teams.find(obj => obj.name == player.team).abbrev}
              </AvatarFallback>
            </Avatar>
            {player.team}
          </div>
        </Card>
      ))}
    </Card>
  );
}
