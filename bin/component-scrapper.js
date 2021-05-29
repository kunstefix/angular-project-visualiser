#! /usr/bin/env node

import {
  findClassName,
  findSelector,
  findTemplateUrl,
  streamToString,
} from "./util.js";
import { resolve } from "path";
import { promises, createReadStream, writeFileSync } from "fs";

export async function run(appPath, outputPath) {
  const components = await getComponentFiles(appPath);
  components.forEach((comp, i) => (comp.id = i));
  const nodes = components.map((c) => ({
    name: c.className,
    id: String(c.id),
    path: c.modelUrl,
  }));
  const links = [];
  await Promise.all(
    components.map(async (comp) => {
      const { selector, className, id } = comp;
      const otherComponents = components.filter((c) => c.id !== id);
      const componentLinks = await getComponentLinks(
        selector,
        className,
        id,
        otherComponents
      );

      componentLinks.forEach((l) =>
        links.push({ source: String(comp.id), target: String(l) })
      );
      return;
    })
  );

  const graphData = {
    nodes,
    links,
  };
  console.log(outputPath);
  writeFileSync(outputPath + "/data.json", JSON.stringify(graphData));
  console.log("Component data is prepared.");
}
// https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
async function extractComponentSummary(directoryPath, componentTsFileName) {
  const filePath = resolve(directoryPath, componentTsFileName);
  const stream = createReadStream(filePath);
  const text = await streamToString(stream);
  const className = findClassName(text);
  const selector = findSelector(text);
  const templateUrl = findTemplateUrl(text);
  const summary = {
    className,
    selector,
    templateUrl: templateUrl ? resolve(directoryPath, templateUrl) : null,
    modelUrl: filePath,
    id: undefined,
  };
  return summary;
}

async function getComponentFiles(dir) {
  const dirents = await promises.readdir(dir, { withFileTypes: true });
  const folders = dirents.filter((dirent) => dirent.isDirectory());
  const files = dirents.filter((dirent) => dirent.isFile());
  // TODO: improve file name check
  const componentTsFiles = files.filter(
    (f) => f.name.includes("component.ts") && !f.name.includes("spec")
  );
  const componentSummaries = await Promise.all([
    ...componentTsFiles.map(async (ctf) =>
      extractComponentSummary(dir, ctf.name)
    ),
    ...folders.map(async (folder) =>
      getComponentFiles(resolve(dir, folder.name))
    ),
  ]);

  return Array.prototype.concat(...componentSummaries);
}

async function checkRelation(fileUrl, searchTerm) {
  const stream = createReadStream(fileUrl);
  const text = await streamToString(stream);
  const fileContainsTerm = text.includes(searchTerm);
  return fileContainsTerm;
}

function logAnalytics(components) {
  console.log("Detected components:", components);
  const componentAnalytics = components.map((comp, i) => ({
    id: i,
    template: !!comp.templateUrl,
    model: !!comp.modelUrl,
    name: comp.className,
    selector: comp.selector,
  }));
  console.table(componentAnalytics);
}

async function getComponentLinks(selector, className, id, otherComponents) {
  const links = [];
  await Promise.all(
    otherComponents.map(async (othrComp) => {
      const { templateUrl, modelUrl } = othrComp;
      const isTemplateRelated = templateUrl
        ? await checkRelation(templateUrl, selector)
        : false;
      const isModelRelated =
        (await checkRelation(modelUrl, className)) ||
        (await checkRelation(modelUrl, selector));

      if (isTemplateRelated || isModelRelated) {
        links.push(othrComp.id);
      }
      return;
    })
  );
  return links;
}
