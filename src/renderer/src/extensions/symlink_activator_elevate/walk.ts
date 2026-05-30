// IMPORTANT: This file is included from elevated code, it can't include electron stuff

import * as path from "path";

import * as fs from "fs-extra";

import type { Inspection } from "../../util/asyncpromise";
import { mapSeries, reflect } from "../../util/asyncpromise";
function walk(
  target: string,
  callback: (iterPath: string, stats: fs.Stats) => Promise<any>,
): Promise<any> {
  let allFileNames: string[];

  return Promise.resolve(fs.readdir(target))
    .then((fileNames: string[]) => {
      allFileNames = fileNames;
      return mapSeries(fileNames, (statPath: string) => {
        const fullPath: string = path.join(target, statPath);
        return reflect(fs.lstat(fullPath));
      });
    })
    .then((res: Array<Inspection<fs.Stats>>) => {
      // use the stats results to generate a list of paths of the directories
      // in the searched directory
      const subDirs: string[] = [];
      const cbPromises: Array<Promise<any>> = [];
      res.forEach((stat, idx) => {
        if (!stat.isFulfilled()) {
          return;
        }
        const fullPath: string = path.join(target, allFileNames[idx]);
        cbPromises.push(callback(fullPath, stat.value()));
        if (stat.value().isDirectory()) {
          subDirs.push(fullPath);
        }
      });
      return Promise.all(cbPromises.concat(mapSeries(subDirs, (subDir) => walk(subDir, callback))));
    })
    .then(() => null);
}

export default walk;
