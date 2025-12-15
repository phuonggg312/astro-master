# MindArc Astro

The purpose of the Astro Theme is to be a starting point for MindArc developers to build client-centric Shopify stores. It is not a plug and play theme where most things can be configured from the theme settings. The theme settings should be reserved for client data or anything the client would like to edit themselves with minimal risk. Design customisations such as topography and colours should be in code as this is not likely to change frequently.

This project is based off [shopify/slate](https://github.com/Shopify/slate) and [shopify/starter-theme](https://github.com/Shopify/starter-theme).

Slate is a command line tool for developing Shopify Themes. See [Slate docs](https://shopify.github.io/slate) for more information. <span style="color:#dc3545">However, we have decided to remove Slate tools and use [webpack](https://webpack.js.org/) directly.</span>

Starter Theme is the opinionated theme developed by the Shopify Themes Team for Slate projects. We will be modifying and building upon this to suit our needs.

## :warning: After cloning

### :construction: Initial setup
The following items are required before the initial git commit.

1. Create private GitHub repo for the new project

2. Clone the new repo to local `git clone https://github.com/mindarc/<new_project>.git`

3. Pull down the latest Astro repo `git pull https://github.com/mindarc/astro.git`

4. In your Shopify development store, install the theme access and create private app for theme development and storefront API

5. Go to [Astro's Shopify store](https://admin.shopify.com/store/mindarc-astro/themes), download the "Astro development" theme

6. Upload the Astro theme zip into your development store and rename it to 'Astro by MindArc'

7. Click on the 'Customize' button and grab the ID of the theme in the URL bar

4. Update `config.yml`

5. Update values in `src/js/utils/api.js`

5. Clean up new project README
- Remove section above --- _Remove above after cloning_ ---
- Fill in project information placeholders

### :octocat: Reset git

1. Remove the current git history
```
rm -rf .git
```

2. Recreate git and link to your new repo
```
git init
git remote add origin https://github.com/mindarc/<new_project>.git
```

3. Initial commit to new project

:bulb: Get the Astro version fron https://github.com/mindarc/astro/releases
```
git add .
git commit -m "Astro <version>"
git push -u origin master
```

:warning: *Created a new git repo?* Update the access to include **mindarc-development**. Do this from repo > Settings > Manage Access > Invite **mindarc/mindarc-development** team as **Admin**

### :rocket: Deploy theme

```
pnpm install
pnpm build-dev
theme deploy
```

------------------------ _Remove above after cloning_ ------------------------
# \<project> by MindArc

- DEV - <dev_url>
- PROD - <prod_url>

This project is based off [mindarc/astro](https://github.com/mindarc/astro).

## Getting started
Assumed knowledge:

- Shopify store setup for theme development
- Basic understanding of [ThemeKit](https://shopify.github.io/themekit/)
- Frontend development using Liquid, Sass and VueJS

### Tools required
- [Nodejs.org](http://nodejs.org/download/)
- [pnpm](https://pnpm.io/installation)
- [ThemeKit](https://shopify.github.io/themekit/) - Please understand the commands and features of [ThemeKit](https://shopify.github.io/themekit/)

### Store setup

1. Add Styleguide page
2. Enable customers and payment
3. Create private app for theme development and storefront API

### Project setup

#### Install dependencies
From your project root, run:
```bash
$ pnpm install
```

#### Theme Kit
Setup `config.yml` file. See [here](https://shopify.github.io/themekit/configuration/) for instructions.

Deploy your theme to your store. See [here](https://shopify.github.io/themekit/commands/#deploy) for instructions.

:warning: *Issues while deploying your theme?* If you are replacing an existing theme with Astro, the old theme's `config/settings_data.json` should be replaced with `{}`. Do this from Shopify admin > Online Store > Theme actions > Edit code.

## Development and deployment

### Local development
Open 2 terminals from your project root and run the following in separate terminals
```
pnpm watch
```
```
theme watch
```

:bulb: *Hint* `theme` commands without environment `-e` specified, defaults to `-e development`.

### Production deployment
Build the production ready assets with
```
pnpm build-prod
```

Then use Theme Kit to deploy
```
theme deploy -e <env>
```

## Linting
We have implemented linting in order to promote best practices, improve coding standards and provide more consistency.
The rulesets used are:
- [Vue recommended](https://vuejs.org/style-guide/rules-recommended.html)
- [JavaScript Standard Style](https://standardjs.com/rules.html)

Linting will run on build commands, but highly recommend installing the [ESLint VSCode plugin](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) to see errors and warnings as you go.

The plugin can optionally be configured to autofix issues, similar to running `pnpm eslint --fix`, but we recommend autofix is forgoed to promote awareness of best practices.

### Disabling Rules with Inline Comments
In rare occasions, some rules need to be bypassed, this is possible using [inline comments](https://eslint.org/docs/2.13.1/user-guide/configuring#disabling-rules-with-inline-comments).

Be careful to only use this when absolutely necessary, for example:
```
// eslint-disable-next-line no-undef
return Shopify.shop === 'mindarc-astro.myshopify.com' ? storefrontAccessToken.dev : storefrontAccessToken.prod
```

## Current library stack

### CSS
* [TailwindCSS](https://tailwindcss.com/docs/utility-first)

### JavaScript
* [Vue 2](https://v2.vuejs.org/)
* vue-slide v0.3.5
