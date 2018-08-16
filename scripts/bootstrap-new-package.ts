#!/usr/bin/env ts-node
// tslint:disable:object-literal-sort-keys no-console

import * as cmdLineArgs from "command-line-args";
import * as fs from "fs";
import * as path from "path";
import * as prettier from "prettier";

const PACKAGE_ROOT = path.normalize(path.join(__dirname, ".."));
const DEFAULT_VERSION = "0.0.1";
const LINE_BREAK = "\n";

const MIT_LICENSE = fs
    .readFileSync(path.join(PACKAGE_ROOT, "LICENSE"))
    .toString();

const PACKAGE_JSON_PROTOTYPE = {
    author: "Automorph Ltd (https://www.automorph.com)",
    license: "MIT",
    browser: "lib/index.js",
    main: "lib/index",
    module: "lib/index.mjs",
    typings: "lib/index.d.ts",
    scripts: {
        prepublishOnly: "tsc-mjs -b tsconfig.json --force",
    },
};

interface IPackageJsonProps {
    name: string;
    version: string;
    description: string;
}

const packageJson = ({ name, version, description }: IPackageJsonProps) => ({
    name,
    version,
    description,
    ...PACKAGE_JSON_PROTOTYPE,
});

const gitignoreFilenames = ["lib"];
const npmignoreFilenames = [
    ".gitignore",
    ".npmignore",
    "node_modules",
    "src",
    "tsconfig",
    "tsconfig.json",
];

const dotFile = (files: string[]) => files.join(LINE_BREAK) + LINE_BREAK;

const indexFileTemplate = (name: string) => `/**
 * ${name} package entrypoint module
 */

export {};
`;

const readmeTemplate = ({ name, description }: IPackageJsonProps) => `# ${name}

${description}

## Install

\`\`\`ts
// If you use yarn
yarn add ${name}

// If you use npm
npm install ${name}
\`\`\`

## License: MIT

Copyright (c) 2018 Automorph Ltd. All rights reserved.

For the complete license text, see the  [LICENSE](./LICENSE) file.
`;

interface IFileContentsMap {
    [key: string]: string | IFileContentsMap;
}

const computeFileStructure = (props: IPackageJsonProps): IFileContentsMap => ({
    // tslint:disable-next-line:object-literal-key-quotes
    src: {
        "index.ts": indexFileTemplate(props.name),
    },
    ".gitignore": dotFile(gitignoreFilenames),
    ".npmignore": dotFile(npmignoreFilenames),
    // tslint:disable-next-line:object-literal-key-quotes
    LICENSE: MIT_LICENSE,
    "package.json": prettier.format(JSON.stringify(packageJson(props)), {
        parser: "json",
        tabWidth: 2,
    }),
    "README.md": readmeTemplate(props),
});

const writeFiles = (fileMap: IFileContentsMap, targetPath: string) => {
    Object.keys(fileMap).forEach((fileName) => {
        const content = fileMap[fileName];
        const fileOutputPath = path.join(targetPath, fileName);
        if (typeof content === "string") {
            fs.writeFileSync(fileOutputPath, content);
        } else {
            fs.mkdirSync(fileOutputPath);
            writeFiles(content, fileOutputPath);
        }
    });
};

const main = () => {
    try {
        const args = cmdLineArgs([
            { name: "name", alias: "n", type: String },
            {
                name: "outDir",
                type: String,
                multiple: false,
                defaultOption: true,
            },
            {
                name: "version",
                alias: "v",
                type: String,
                defaultValue: DEFAULT_VERSION,
            },
            { name: "description", alias: "d", type: String, defaultValue: "" },
            { name: "scope", alias: "s", type: String, defaultValue: "" },
        ]);

        if (args.name.length === 0) {
            throw new Error(
                "You haven't provided a package name, so I cannot bootstrap a new package for you.",
            );
        }

        const name =
            args.scope && args.scope.length > 0
                ? "@" + args.scope + "/" + args.name
                : args.name;
        const version =
            args.version && args.version.length > 0
                ? args.version
                : DEFAULT_VERSION;
        const description =
            args.description && args.description.length > 0
                ? args.description
                : name + " package";

        const files = computeFileStructure({
            name,
            version,
            description,
        });

        const outDir = args.outDir;

        const normalizedOutDirPath = path.normalize(outDir);

        if (fs.existsSync(normalizedOutDirPath)) {
            throw new Error(
                "There exists a file or directory at the output location.",
            );
        }

        fs.mkdirSync(normalizedOutDirPath);
        writeFiles(files, normalizedOutDirPath);

        fs.symlinkSync(
            path.relative(
                normalizedOutDirPath,
                path.normalize(
                    path.join(PACKAGE_ROOT, "shared", "tsconfig.json"),
                ),
            ),
            path.join(normalizedOutDirPath, "tsconfig.json"),
        );
        fs.symlinkSync(
            path.relative(
                normalizedOutDirPath,
                path.normalize(path.join(PACKAGE_ROOT, "shared", "tsconfig")),
            ),
            path.join(normalizedOutDirPath, "tsconfig"),
        );
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

main();
