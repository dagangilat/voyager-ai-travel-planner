module.exports = {module.exports = {

  root: true,  root: true,

  env: {  env: {

    es6: true,    es6: true,

    node: true,    node: true,

  },  },

  extends: [  extends: [

    "eslint:recommended",    "eslint:recommended",

    "google",  ],

  ],  rules: {

  rules: {    quotes: ["error", "double"],

    quotes: ["error", "double"],  },

  },  parserOptions: {

};    ecmaVersion: 2020,
  },
};