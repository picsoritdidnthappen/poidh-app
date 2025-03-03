## Contributing

Thank you for your interest in contributing to POIDH! Before you start coding, please review this guide to ensure a smooth process from development to submitting a pull request.

If you're new or unsure where to begin, check the [Discussions](https://github.com/poidh/poidh-app/discussions) tab for ideas and help.

### Quick Start Guide

This guide will help you set up your local environment for running and contributing to the POIDH app, including setting up automatic formatting and linting.

#### Overview

- [Cloning the Repository](#cloning-the-repository)
- [Installing Node.js and pnpm](#installing-nodejs-and-pnpm)
- [Installing Dependencies](#installing-dependencies)
- [Running the Project](#running-the-project)
- [Submitting Pull Requests](#submitting-pull-requests)

---

### Cloning the Repository

1. Clone the repository to your local machine. Ensure you have Git installed. [Git installation guide](https://git-scm.com/docs).

   ```bash
   git clone https://github.com/picsoritdidnthappen/poidh-app
   ```

2. Navigate into the project directory.

   ```bash
   cd poidh-app
   ```

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Installing Node.js and pnpm

POIDH uses **pnpm** as a package manager and requires **Node.js v18.12 or higher**.

1. Check your versions to confirm compatibility:

   ```bash
   node -v
   pnpm -v
   ```

2. If you need to install or update:

   - [Install Node.js](https://nodejs.org)
   - [Install pnpm](https://pnpm.io/)

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Indexer Setup

Before starting, make sure to clone the **Indexer** repository:

```bash
git clone https://github.com/yukigesho/poidh-indexer.git
```

Next, follow the setup instructions in the **Indexer** repository's README. Don't forget to configure the `.env` file with your PostgreSQL database connection URL:

```plaintext
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>"
```

Ensure the database is properly set up before proceeding.

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Installing Dependencies

1. In the project root directory, install all required dependencies:

   ```bash
   pnpm install
   ```

2. This command will update and install all necessary packages.

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Running the Project

1. Start the POIDH app:

   ```bash
   pnpm start
   ```

   Or, if you're running a development build:

   ```bash
   pnpm dev
   ```

2. The app should now be running locally! Check your terminal output for any additional information or errors.

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Submitting Pull Requests

To contribute code, follow these steps:

1. **Style Guide**: Please review the POIDH style guide to maintain consistency in the codebase.

2. **Code Check**: Before submitting, make sure your code is formatted and linted. GitHub Actions will automatically build, lint, and format your pull request, highlighting issues if they exist.

3. **Commit Titles and Descriptions**: Keep titles and descriptions concise yet informative to help reviewers understand your changes.

4. **Build Command**: Don’t forget to run the following to ensure your build is up to date:

   ```bash
   pnpm build
   ```

5. **Pull Request Review**: After submitting, if you see a ❌, review the error logs under the “Actions” tab to identify any issues.

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Thank You!

We appreciate your contribution to POIDH. Happy coding and thank you for helping to make POIDH even better!
