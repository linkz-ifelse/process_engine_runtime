'use strict';

const should = require('should');
const path = require('path');

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Deployment API -> importBpmnFromFile', () => {

  let testFixtureProvider;
  let defaultIdentity;
  let restrictedIdentity;

  const processModelId = 'generic_sample';
  const processModelIdNoLanes = 'process_model_without_lanes';
  const processModelIdNameMismatch = 'process_model_name_mismatch';
  const processModelIdTooManyProcesses = 'process_model_too_many_processes';

  let processModelPath;
  let processModelPathNoLanes;
  let processModelPathNameMismatch;
  let processModelPathTooManyProcesses;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    const bpmnFolderLocation = testFixtureProvider.getBpmnDirectoryPath();

    processModelPath = path.join(bpmnFolderLocation, `${processModelId}.bpmn`);
    processModelPathNoLanes = path.join(bpmnFolderLocation, `${processModelIdNoLanes}.bpmn`);
    processModelPathNameMismatch = path.join(bpmnFolderLocation, `${processModelIdNameMismatch}.bpmn`);
    processModelPathTooManyProcesses = path.join(bpmnFolderLocation, `${processModelIdTooManyProcesses}.bpmn`);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully import a ProcessModel', async () => {
    await testFixtureProvider.deploymentApiService.importBpmnFromFile(defaultIdentity, processModelPath, processModelId, true);
    await assertThatImportWasSuccessful();
  });

  it('should successfully import a ProcessModel without any lanes', async () => {

    const overwriteIfExists = true;
    await testFixtureProvider
      .deploymentApiService
      .importBpmnFromFile(defaultIdentity, processModelPathNoLanes, processModelIdNoLanes, overwriteIfExists);

    await assertThatImportWasSuccessful();
  });

  it('should fail to import a ProcessModel, if a process model by the same name exists, and overwriteExisting is set to false', async () => {

    try {
      // Run this twice to ensure that this test case is always executable.
      await testFixtureProvider.deploymentApiService.importBpmnFromFile(defaultIdentity, processModelPath, processModelId, false);
      await testFixtureProvider.deploymentApiService.importBpmnFromFile(defaultIdentity, processModelPath, processModelId, false);

      should.fail(undefined, 'error', 'This request should have failed, because a ProcessModel already exists!');
    } catch (error) {
      const expectedErrorCode = 409;
      const expectedErrorMessage = /already exists/i;
      should(error.code).be.eql(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to import a ProcessModel, when the user is not authenticated', async () => {

    try {
      await testFixtureProvider.deploymentApiService.importBpmnFromFile(undefined, processModelPath);
      should.fail({}, 'error', 'This request should have failed, due to missing user authentication!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token/i;
      should(error.code).be.eql(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to import a ProcessModel, when the user is forbidden to see the process instance result', async () => {

    try {
      await testFixtureProvider.deploymentApiService.importBpmnFromFile(restrictedIdentity, processModelPath);
      should.fail(undefined, 'error', 'This request should have failed, due to a missing claim!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.eql(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  // Note: Current restrictions state that a ProcessModel must have the same name as the Definition file.
  // Otherwise the ProcessModel would not be retrievable.
  it('should fail to import a ProcessModel, when the ProcessModel name does not match the ProcessDefinition name', async () => {

    try {
      await testFixtureProvider
        .deploymentApiService
        .importBpmnFromFile(defaultIdentity, processModelPathNameMismatch, processModelIdNameMismatch);

      should.fail(undefined, 'error', 'This request should have failed, because the ProcessDefinition has more than one model!');
    } catch (error) {
      const expectedErrorMessage = /ProcessModel contained within the diagram.*?must also use the name/i;
      const expectedErrorCode = 422;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }
  });

  // Note: This may be supported in future versions, but right now such a BPMN file would break everything.
  // So we need to make sure that those types of ProcessModels do not get deployed.
  // Otherwise, BPMN Studio will be unable to use the Runtime at all.
  it('should fail to import a ProcessModel, when the file contains more than one Process', async () => {

    try {
      await testFixtureProvider
        .deploymentApiService
        .importBpmnFromFile(defaultIdentity, processModelPathTooManyProcesses, processModelIdTooManyProcesses);

      should.fail(undefined, 'error', 'This request should have failed, because the ProcessDefinition has more than one model!');
    } catch (error) {
      const expectedErrorMessage = /contains more than one ProcessModel/i;
      const expectedErrorCode = 422;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.eql(expectedErrorCode);
    }
  });

  async function assertThatImportWasSuccessful() {

    const existingProcessModel = await testFixtureProvider
      .processModelService
      .getProcessModelById(testFixtureProvider.identities.defaultUser, processModelId);

    should.exist(existingProcessModel);
  }

});
