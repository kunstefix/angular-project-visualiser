import * as fs from "fs";

export function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function findRegex(regex, textString) {
  const result = textString.match(regex);
  return result && result[0];
}

export function findClassName(textString) {
  const classNameRegex = /(?<=class\s+)[^\s]*/g;
  return findRegex(classNameRegex, textString);
}

export function findSelector(textString) {
  const selectorRegex = /(?<=selector:\s*')[^\s]*(?=')/g;
  return findRegex(selectorRegex, textString);
}

export function findTemplateUrl(textString) {
  const templateRegex = /(?<=templateUrl:\s*')[^\s]*(?=')/g;
  return findRegex(templateRegex, textString);
}

