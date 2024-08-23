---
title: "LegionTD2 Go SDK (v0.2.0)"
publishedAt: 2023-08-20
description: "Side project"
isPublish: true
---

![LegionTD2](/legiontdsdk/header.png)

Recently I've been fascinated with a game called [LegionTD2](https://beta.legiontd2.com/), this is a newly created game that I've been playing
as a map ever since Warcraft 3, it is tactical multiplayer tower-defense(td). The game is based on predictions and timings, if you play your cards right (or in the context of the game: sends/workers/units) you will prevail over the enemy team. Read more about it [here](https://store.steampowered.com/app/469600/Legion_TD_2__Multiplayer_Tower_Defense/).


# LegionTD SDK

I've doing stuff in Go in my free time (mainly code challenges) for a while now and I've decided that I should spend some time creating something useful for myself such as creating tools that would help me get better at the game. The game has an API which resides [here](https://swagger.legiontd2.com/), there are couple of endpoints that are useful for helpful statistics such as the `player/*` and `games/*` endpoints. I knew that I will be querying the API a lot for 
fetching info about players and games, so I've decided to create an SDK for that so I can ease my work a little bit. And after couple of weeks free time work I've created the [LegionTD 2 SDK for Go](https://github.com/syrull/ltdsdk).


# Functionality

## Analyze games

While my ultimate goal is to create set of analytics tools for Legion, I've created the most basic example of how that might happen using SQLite3 and Go.

Under the [examples/analyze_games/](https://github.com/syrull/ltdsdk/tree/main/examples/analyze_games) I've created an example that fetches about 3k games and put them into a SQLite database, after that you are able to analyze the data using SQL. I've created a simple query that gets the percentage of games 
that are being finished at waves 15, 13 and 10.

In my case here are the results, games finished at wave

| Wave 15 |  Wave 13 | Wave 10
|---|---|---|
| 20%	| 14% | 4% |

## Exporting the games

You can derive that from the previous example but I've created a dedicated examples for both exporting to JSON and exporting to SQL.

- [Export games to SQL](https://github.com/syrull/ltdsdk/tree/main/examples/export_games_to_sql)
- [Export games to JSON](https://github.com/syrull/ltdsdk/blob/main/examples/export_games_to_json/main.go)

## Fetching all of the Units

Since that the game hasn't got a dedicated route for fetching all the units I've created a simple example that resides in the repository under [examples/get_all_units](https://github.com/syrull/ltdsdk/tree/main/examples/get_all_units). The important thing here is that I've exported all the units into a single txt file and then I just spawn requests for each unit. 

# Conclusion

I will be updating the SDK as I am progressing with the analytical tools and I will be adding new examples and adding new posts as I am doing it. For now you can keep an eye on the [repository](https://github.com/syrull/ltdsdk/) and I will be definitely posting/discussing more about it in the [Discord Channel](https://discord.gg/ttnSSqyV).