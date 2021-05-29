#! /usr/bin/env node
import { spawnSync } from "child_process";
import { run } from "./component-scrapper.js";
import { fileURLToPath } from "url";
import { dirname, extname, basename, resolve } from "path";
import { promises, readdirSync } from "fs";

// find src/app directory
const rootPath = process.cwd();
const srcPath = findSrc(rootPath);
function findSrc(folderPath) {
  const dirents = readdirSync(folderPath, { withFileTypes: true });
  let srcDir = dirents.find((dirent) => dirent.name === "src");
  if (srcDir) {
    const srcDirPath = resolve(folderPath, srcDir.name);
    return srcDirPath;
  } else {
    const subDirs = dirents.filter((dirent) => dirent.isDirectory());
    for (const subDir of subDirs) {
      if (["e2e", "node_modules"].includes(subDir.name)) {
        continue;
      }
      console.log(subDir.name);
      const subDirPath = resolve(folderPath, subDir.name);
      srcDir = findSrc(subDirPath);
      if (srcDir) {
        return srcDir;
      }
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDirPath = __dirname.replace("bin", ".");

console.log("Scanning project for components in directory: ", srcPath);
run(srcPath, packageDirPath).then(() => {
  spawnSync(`http-server`, [packageDirPath], { stdio: "inherit" });
});
