# devlog

## 12.13.25

okay, basic idea and spec are in

wrote prompt for planning

planned and answered cc questions

scaffolded deno.json

checking deno.json

versions of std look good, moving on

init src folders

init types / domain modelling

reviewing types

initial experiment type looks weird

```
export interface Experiment {
  version: number;
  name: string;
  description?: string;
  createdAt: string; // ISO datetime
  template?: string; // template used to create

  hypotheses: string[];

  conditions: Record<string, Condition>;

  // Custom questions (if not using defaults)
  prompts?: {
    checkin?: PromptDefinition[];
    daily?: PromptDefinition[];
    weekly?: PromptDefinition[];
  };

  // Linked repo for in-repo mode
  linkedRepo?: string;
}
```

I'm thinking perhaps the "in repo"mode is not very helpful and adds unwarranted complexity. I may remove from V1. 

decided to remove from v1 + add decision log

moved string dates to typed dates, will layer DTO for json serialization if needed

updated docs

updated cc plan

created decision log

impl config

impl state

impl prompts

impl lib/format

impl templates/blank

impl templates/ai-coding

impl commands/init

impl main

validate --help

impl block

impl daily

impl checkin

impl log

reviewing milestone 1 code

remove version const from main, use manifest

rewrite commands to include validators & validate inputs

reviewed more code

moved tests to __tests__

review review review


