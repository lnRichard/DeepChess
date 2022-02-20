/* eslint-disable no-undef */
module.exports = {
    "env": {
        "browser": true,
        "es2022": true,
        "node": true,
    },
    "plugins": [
        "unicorn",
        "sonarjs",
    ],
    "extends": [
        "eslint:recommended",
        "plugin:unicorn/recommended",
        "plugin:sonarjs/recommended",
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        "unicorn/prefer-at": "error",
        "unicorn/prefer-string-replace-all": "error",
        "unicorn/prefer-module": "off",
    },
};
