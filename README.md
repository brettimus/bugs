
## Setup

> Note - You will need to have the neon cli installed and authenticated to set up the database

### Running the API

Make sure to set up the database (section below)

```sh
# MEM: Set up database before this
npm run db:seed

npm install
npm run dev
```

### Setting up a neon database

You'll need to creat a neon account and install the CLI.

Neon commands! This can help set up or configure a neon database for project named `bug`

```sh
# Authenticate with neon cli
neonctl auth

# Create project if you haven't already
PROJECT_NAME=bug
neonctl projects create --name $PROJECT_NAME --set-context

# If you already have a project, use this to set the id in a neon context file
#
# PROJECT_ID=$(neonctl projects list --output=json | jq --arg name "$PROJECT_NAME" '.projects[] | select(.name == $name) | .id')
# neonctl set-context --project-id=$PROJECT_ID

# Create a `dev` db branch then set context
BRANCH_NAME=dev
neonctl branches create --name=$BRANCH_NAME
neonctl set-contenxt --branch=$BRANCH_NAME

# Finally, add connection string to .dev.vars
DATABASE_URL=$(neonctl connection-string --project-id=$PROJECT_ID)
echo -e '\nDATABASE_URL='$DATABASE_URL'\n' >> .dev.vars
```

## Deploy

```sh
npm run deploy
```