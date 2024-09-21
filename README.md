## Contributing

Please look over this documentation before you start coding and submitting changes. This will help make your pull request as seamless as possible.

If you are a beginner and/or unsure where to start, please look in the discussion tab.

### Basic Guide

This guide is intended to get you started with contributing. It will set up your local environment to handle running the POIDH app. It will also set up your local environment with automatic formatting and linting.

- [Cloning the repository](#cloning-the-repoistory)
- [Installing Node.js and pnpm](#installing-nodejs-and-pnpm)
- [Installing Dependencies](#installing-dependencies)
- [Submitting Pull Request](#submitting-pull-requests)

---

#### cloning the repoistory

To begin, clone the repository for your local machine using git. [Please refer to the git documentation if you do not have git installed.](https://git-scm.com/docs)

```bash
git clone https://github.com/poidh/poidh-app.git
```

Or if you have the [GitHube CLI](https://cli.github.com) installed:

```bash
gh repo clone picsoritdidnthappen/poidh-app
```

<div align="right">
<a href="#basic-guide">↑ Scroll Up</a>
</div>

---

#### Installing nodejs and pnpm

POIDH utilizes pnpm as a node package manager. This requires **Node.js v18.12 or higher** and we recommend the latest version of pnpm.

To check the versions for your local environment, use the following code:

```bash
node -v
pnpm -v
```

If you need to install or reinstall to meet the minimum version requirements, use the following docs:

- [Node.js](https://nodejs.org)
- [PNPM](https://pnpm.io/)

<div align="right">
<a href="#basic-guide">↑ Scroll Up</a>
</div>

---

#### Installing Dependencies

Move into the root directory of the project and run the following command:

```bash
pnpm install
```

All dependencies will be updated and installed. Please

<div align="right">
<a href="#basic-guide">↑ Scroll Up</a>
</div>

---

#### Submitting Pull Requests

Please take a look at POIDH's styling guide to maintain uniformity with the code base. Please try to be concise in your titles and descriptions.

When submitted, github will automatically build, lint and format the changes. Once pulled if a red x like this: ❌ appears, please check your code for potential bugs or errors. Use the logs provided under the actions tab to determine the error.

<div align="right">
<a href="#basic-guide">↑ Scroll Up</a>
</div>

---

You are all set. Happy hacking and thanks once again for helping to contribute to POIDH.
