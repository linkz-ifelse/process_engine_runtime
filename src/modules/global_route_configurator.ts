import {InvocationContainer} from 'addict-ioc';
import {
  NextFunction,
  Request,
  Response,
  static as expressStatic,
} from 'express';
import * as fs from 'fs';
import * as path from 'path';

import {IHttpExtension} from '@essential-projects/http_contracts';

import {absolutePath as getPathToSwagger} from 'swagger-ui-dist';

let httpExtension: IHttpExtension;

const httpStatusCodeSuccess = 200;

interface IApplicationInfo {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
  author: string | object;
  contributors: Array<string>;
  repository: string | object;
  bugs: string | object;
}

export async function configureGlobalRoutes(container: InvocationContainer, useHttpRootRoutes: boolean): Promise<void> {
  httpExtension = await container.resolveAsync<IHttpExtension>('HttpExtension');

  configureRootRoute(useHttpRootRoutes);
  configureAuthorityRoute(useHttpRootRoutes);
}

function configureRootRoute(useHttpRootRoutes: boolean): void {

  const packageInfo = getInfosFromPackageJson();

  const formattedResponse = JSON.stringify(packageInfo, undefined, 2);

  // Note: If the ProcessEngine runs as an embedded service, this route will likely be occupied by another application.
  if (useHttpRootRoutes) {
    httpExtension.app.get('/', (request: Request, response: Response, next: NextFunction): void => {
      if (request.headers['content-type'] === 'application/json') {
        response
          .status(httpStatusCodeSuccess)
          .header('Content-Type', 'application/json')
          .send(formattedResponse);

        return;
      }

      response.sendFile(path.resolve(__dirname, '..', '..', '..', 'swagger.html'));
    });

    httpExtension.app.use(expressStatic(getPathToSwagger()));
  }

  httpExtension.app.get('/process_engine', (request: Request, response: Response): void => {
    response
      .status(httpStatusCodeSuccess)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function configureAuthorityRoute(useHttpRootRoutes: boolean): void {

  const iamConfig = loadConfig('iam', 'iam_service');

  const responseBody = {
    authority: process.env.iam__iam_service__basePath || iamConfig.basePath,
  };

  const authorityRoute = '/security/authority';
  const formattedResponse = JSON.stringify(responseBody, undefined, 2);

  // Note: If the ProcessEngine runs as an embedded service, the root namespace should not be occupied.
  if (useHttpRootRoutes) {
    httpExtension.app.get(authorityRoute, (request: Request, response: Response): void => {
      response
        .status(httpStatusCodeSuccess)
        .header('Content-Type', 'application/json')
        .send(formattedResponse);
    });
  }

  httpExtension.app.get(`/process_engine${authorityRoute}`, (request: Request, response: Response): void => {
    response
      .status(httpStatusCodeSuccess)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function loadConfig(configDirName: string, configFileName: string): any {

  const baseConfigPath = process.env.CONFIG_PATH && path.isAbsolute(process.env.CONFIG_PATH)
    ? process.env.CONFIG_PATH
    : path.join(process.cwd(), 'config');

  const configPath = path.join(baseConfigPath, process.env.NODE_ENV, configDirName, `${configFileName}.json`);

  // eslint-disable-next-line
  const loadedConfig = require(configPath);

  return loadedConfig;
}

function getInfosFromPackageJson(): IApplicationInfo {

  const pathToPackageJson = path.join(__dirname, '..', '..', '..', 'package.json');
  const packageJsonAsString = fs.readFileSync(pathToPackageJson, 'utf-8');

  const packageJson = JSON.parse(packageJsonAsString);

  const {
    name,
    version,
    description,
    license,
    homepage,
    author,
    contributors,
    repository,
    bugs,
  } = packageJson;

  const applicationInfo = {
    name: name,
    version: version,
    description: description,
    license: license,
    homepage: homepage,
    author: author,
    contributors: contributors,
    repository: repository,
    bugs: bugs,
  };

  return applicationInfo;
}
