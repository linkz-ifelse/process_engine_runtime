'use strict';

const should = require('should');

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Call activity tests', () => {

  let testFixtureProvider;

  const startEventId = 'StartEvent_1';
  const useAutoGeneratedCorrelationId = undefined;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    const processDefFileList = [
      'call_activity_subprocess',
      'call_activity_subprocess_error',
      'call_activity_subprocess_nested',
      'call_activity_test',
      'call_activity_test_error',
    ];

    await testFixtureProvider.importProcessFiles(processDefFileList);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should execute a process which uses a call activity to increment a given token', async () => {
    const processModelId = 'call_activity_test';

    const initialToken = {
      operation: 'basic_test',
    };

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, initialToken);

    should(result).have.property('currentToken');
    should(result.currentToken).have.property('history');
    should(result.currentToken).have.property('current');

    const task1Result = result.currentToken.history.Task1;
    const finalResult = result.currentToken.current;

    should(task1Result).be.eql(1, `Expected a value of 1 to be passed to the subprocess, but instead got ${task1Result}`);
    should(finalResult).be.eql(2, `Expected a subprocess result of 2, but instead got ${finalResult}`);
  });

  it('should execute a process which uses two nested call activities to increment a given token', async () => {
    const processModelId = 'call_activity_test';

    const initialToken = {
      operation: 'nested_test',
    };

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, initialToken);

    should(result).have.property('currentToken');
    should(result.currentToken).have.property('history');
    should(result.currentToken).have.property('current');

    const task1Result = result.currentToken.history.Task1;
    const finalResult = result.currentToken.current;

    should(task1Result).be.eql(1, `Expected a value of 1 to be passed to the nested subprocess, but instead got ${task1Result}`);
    should(finalResult).be.eql(3, `Expected a subprocess result of 3, but instead got ${finalResult}`);
  });

  it('should call an erroneous call activity, whose error will be handled by the call activity itself', async () => {
    const processModelId = 'call_activity_test_error';

    const initialToken = {
      handle_exception: true,
    };

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, initialToken);

    should(result).have.property('currentToken');
    should(result.currentToken).have.property('current');
    should(result.currentToken.current).be.match(/error caught by subprocess/i);
  });

  it('should call an erroneous call actvity, whose error will be handled by a boundary event in the calling process', async () => {
    const processModelId = 'call_activity_test_error';

    const initialToken = {
      handle_exception: false,
    };

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, initialToken);

    should(result).have.property('currentToken');
    should(result.currentToken).have.property('current');
    should(result.currentToken.current).be.match(/error caught by main process/i);
  });
});
