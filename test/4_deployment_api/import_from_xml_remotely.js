'use strict';

const should = require('should');
const uuid = require('uuid');

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

const importRoute = 'api/deployment/v1/import_process_model';

describe(`Deployment API -> POST ${importRoute}`, () => {

  let testFixtureProvider;

  let authHeadersDefault;
  let authHeadersForbidden;
  const authHeadersUnauthenticated = {};

  let httpClient;

  const processModelId = 'generic_sample';
  const processModelIdNoLanes = 'process_model_without_lanes';
  let processModelAsXml;
  let processModelNoLanesAsXml;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    authHeadersDefault = createRequestAuthHeaders(testFixtureProvider.identities.defaultUser);
    authHeadersForbidden = createRequestAuthHeaders(testFixtureProvider.identities.restrictedUser);

    processModelAsXml = testFixtureProvider.readProcessModelFile(processModelId);
    processModelNoLanesAsXml = testFixtureProvider.readProcessModelFile(processModelIdNoLanes);

    httpClient = await testFixtureProvider.resolveAsync('HttpService');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully import a ProcessModel, if it does not yet exist and overwriteExisting is set to false', async () => {

    // This is to ensure that any existing process models will not falsify the results.
    const uniqueImportName = uuid.v4();

    const importPayload = {
      name: uniqueImportName,
      xml: processModelAsXml,
      overwriteExisting: false,
    };

    await httpClient.post(importRoute, importPayload, authHeadersDefault);

    await assertThatImportWasSuccessful();
  });

  it('should successfully import a ProcessModel, if it already exists and overwriteExisting is set to true', async () => {

    // This is to ensure that any existing process models will not falsify the results.
    const uniqueImportName = uuid.v4();

    const importPayload = {
      name: uniqueImportName,
      xml: processModelAsXml,
      overwriteExisting: true,
    };

    // The value of overwriteExisting doesn't matter for the first import run.
    await httpClient.post(importRoute, importPayload, authHeadersDefault);
    await httpClient.post(importRoute, importPayload, authHeadersDefault);

    await assertThatImportWasSuccessful();
  });

  it('should successfully import a ProcessModel without any lanes', async () => {

    const importPayload = {
      name: processModelIdNoLanes,
      xml: processModelNoLanesAsXml,
      overwriteExisting: true,
    };

    await httpClient.post(importRoute, importPayload, authHeadersDefault);

    await assertThatImportWasSuccessful();
  });

  it('should fail to import a ProcessModel, if a process model by the same name exists, and overwriteExisting is set to false', async () => {

    try {

      // This is to ensure that any existing process models will not falsify the results.
      const uniqueImportName = uuid.v4();

      const importPayload = {
        name: uniqueImportName,
        xml: processModelAsXml,
        overwriteExisting: false,
      };

      // The value of overwriteExisting doesn't matter for the first import run.
      await httpClient.post(importRoute, importPayload, authHeadersDefault);
      await httpClient.post(importRoute, importPayload, authHeadersDefault);

      should.fail(undefined, 'error', 'This request should have failed, because the process model already exists!');
    } catch (error) {
      const expectedErrorCode = 409;
      const expectedErrorMessage = /already exists/i;
      should(error.code).be.eql(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }

  });

  it('should fail to import a ProcessModel, when the user is not authenticated', async () => {

    const importPayload = {
      name: processModelId,
      xml: processModelAsXml,
      overwriteExisting: false,
    };

    try {
      await httpClient.post(importRoute, importPayload, authHeadersUnauthenticated);
      should.fail({}, 'error', 'This request should have failed, due to missing user authentication!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token/i;
      should(error.code).be.eql(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to import a ProcessModel, when the user is forbidden to see the process instance result', async () => {

    const importPayload = {
      name: processModelId,
      xml: processModelAsXml,
      overwriteExisting: false,
    };

    try {
      await httpClient.post(importRoute, importPayload, authHeadersForbidden);
      should.fail(undefined, 'error', 'This request should have failed, due to a missing claim!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.eql(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  async function assertThatImportWasSuccessful() {

    const existingProcessModel = await testFixtureProvider
      .processModelService
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should.exist(existingProcessModel);
  }

  function createRequestAuthHeaders(identity) {
    const noTokenProvided = !identity || typeof identity.token !== 'string';
    if (noTokenProvided) {
      return {};
    }

    const requestAuthHeaders = {
      headers: {
        Authorization: `Bearer ${identity.token}`,
      },
    };

    return requestAuthHeaders;
  }

});
