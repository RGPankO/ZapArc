# Command Reference

Quick reference for all available npm scripts and commands.

## Development Commands

### Start Development Server
```bash
npm run dev
```
- Starts server with hot reload
- Watches for file changes
- Auto-restarts on changes
- Runs on port 3001 (configurable in .env)

### Build for Production
```bash
npm run build
```
- Compiles TypeScript to JavaScript
- Output directory: `dist/`
- Includes type definitions
- Source maps enabled

### Start Production Server
```bash
npm start
```
- Runs compiled JavaScript from `dist/`
- No hot reload
- Requires `npm run build` first

## Database Commands

### Generate Prisma Client
```bash
npm run prisma:generate
```
- Generates TypeScript client from schema
- Run after modifying `prisma/schema.prisma`
- Updates types automatically

### Push Schema to Database
```bash
npm run prisma:push
```
- Syncs schema with database
- Creates/updates tables
- No migration files created
- Good for development

### Create Migration
```bash
npm run prisma:migrate
```
- Creates migration files
- Applies changes to database
- Recommended for production
- Tracks schema changes

### Open Prisma Studio
```bash
npm run prisma:studio
```
- Opens database GUI at http://localhost:5555
- Visual interface for data
- Create/edit/delete records
- View relationships

## Utility Commands

### Test Database Connection
```bash
npx tsx scripts/test-connection.ts
```
- Tests PostgreSQL connection
- Verifies Prisma setup
- Lists tables and users
- Helpful for troubleshooting

### Type Check
```bash
npx tsc --noEmit
```
- Type checks without compiling
- Catches TypeScript errors
- No output files

### Format Code (if prettier installed)
```bash
npx prettier --write "src/**/*.ts"
```
- Formats all TypeScript files
- Consistent code style

## Docker Commands (if using Docker)

### Start PostgreSQL
```bash
cd .. && docker-compose up -d
```
- Starts PostgreSQL container
- Runs in background
- Uses port 5432

### Stop PostgreSQL
```bash
cd .. && docker-compose down
```
- Stops PostgreSQL container
- Keeps data intact

### View Logs
```bash
cd .. && docker-compose logs -f postgres
```
- Shows PostgreSQL logs
- Follow mode (-f)

## Database Management

### Reset Database (WARNING: Deletes all data!)
```bash
npx prisma migrate reset
```
- Drops database
- Recreates from scratch
- Applies all migrations
- Reseeds if configured

### View Migration Status
```bash
npx prisma migrate status
```
- Shows applied migrations
- Highlights pending migrations

### Deploy Migrations (Production)
```bash
npx prisma migrate deploy
```
- Applies pending migrations
- No prompts (CI/CD friendly)
- Fails on schema drift

## Testing & Debugging

### Interactive Node REPL with TypeScript
```bash
npx tsx
```
- TypeScript REPL
- Import and test code
- Useful for debugging

### Run TypeScript File
```bash
npx tsx path/to/file.ts
```
- Executes TypeScript directly
- No compilation step

### Check Dependencies
```bash
npm outdated
```
- Shows outdated packages
- Current vs wanted vs latest

### Update Dependencies
```bash
npm update
```
- Updates to compatible versions
- Respects package.json ranges

## Environment Management

### Copy Environment Template
```bash
cp .env.example .env
```
- Creates .env from template
- Edit with your values

### Validate Environment
```bash
node -e "require('dotenv').config(); console.log(process.env)"
```
- Prints all environment variables
- Verify .env is loaded

## Process Management

### Kill Process on Port 3001 (Windows)
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Kill Process on Port 3001 (Linux/Mac)
```bash
lsof -ti:3001 | xargs kill -9
```

## Git Commands (if using version control)

### Initialize Repository
```bash
git init
git add .
git commit -m "Initial commit: tRPC backend"
```

### Create .gitignore
Already included! See `.gitignore` file.

## Quick Start Sequence

First time setup:
```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env if needed

# 3. Test database connection
npx tsx scripts/test-connection.ts

# 4. Generate Prisma client
npm run prisma:generate

# 5. Push schema to database
npm run prisma:push

# 6. Start development server
npm run dev
```

## Production Deployment Sequence

```bash
# 1. Set production environment variables
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."

# 2. Install dependencies (production only)
npm ci --production

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run migrations
npx prisma migrate deploy

# 5. Build application
npm run build

# 6. Start server
npm start
```

## Troubleshooting Commands

### Clear Node Modules
```bash
rm -rf node_modules package-lock.json
npm install
```

### Regenerate Prisma Client
```bash
rm -rf node_modules/.prisma
npm run prisma:generate
```

### Check Port Usage
```bash
# Windows
netstat -ano | findstr :3001

# Linux/Mac
lsof -i:3001
```

### Test JWT Token Generation
```bash
node -e "
const jwt = require('jsonwebtoken');
require('dotenv').config();
const token = jwt.sign(
  { userId: 'test', email: 'test@test.com', type: 'access' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);
console.log(token);
"
```

## Package Management

### Add New Dependency
```bash
npm install package-name
```

### Add Dev Dependency
```bash
npm install -D package-name
```

### Remove Dependency
```bash
npm uninstall package-name
```

### Check Package Info
```bash
npm info package-name
```

## Performance & Monitoring

### Check Bundle Size
```bash
npm run build && du -sh dist/
```

### Analyze Dependencies
```bash
npm list --depth=0
```

### Security Audit
```bash
npm audit
npm audit fix
```

## Useful Aliases (add to ~/.bashrc or ~/.zshrc)

```bash
alias dev='npm run dev'
alias build='npm run build'
alias pstudio='npm run prisma:studio'
alias pgen='npm run prisma:generate'
alias ppush='npm run prisma:push'
```

## Documentation

### Generate API Documentation (if installed)
```bash
npx typedoc src/index.ts
```

### View Package Scripts
```bash
npm run
```

## Support & Help

### View Node Version
```bash
node --version
```

### View npm Version
```bash
npm --version
```

### View Environment Info
```bash
npm config list
```

### Get Help for npm Command
```bash
npm help <command>
npm help run-script
```

## Tips

- Use `npx` to run packages without installing globally
- Use `npm ci` in CI/CD for reproducible builds
- Use `npm run` to see all available scripts
- Check `package.json` scripts section for custom commands
- Use `--verbose` flag for detailed logs: `npm run dev --verbose`

Happy developing!
