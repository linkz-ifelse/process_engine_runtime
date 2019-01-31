'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Exclusive Gateway - ', async () => {

  let testFixtureProvider;

  const startEventId = 'StartEvent_1';
  const useAutoGeneratedCorrelationId = undefined;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    const processDefFileList = [
      'exclusive_gateway_test',
      'exclusive_gateway_nested_test',
      'exclusive_gateway_unsupported_test',
      'exclusive_gateway_multiple_paths_test',
    ];

    await testFixtureProvider.importProcessFiles(processDefFileList);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should evaluate the initial token value correct and direct the token the right path', async () => {

    const processModelId = 'exclusive_gateway_test';

    const initialToken = 'right';

    const expectedResult = /right path/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, initialToken);

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('should evaluate the initial token value correct and direct the token the left path', async () => {

    const processModelId = 'exclusive_gateway_test';

    const initialToken = 'left';

    const expectedResult = /left path/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, initialToken);

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('should direct the token through two nested exclusive gateways, taking the nested left path.', async () => {

    const processModelId = 'exclusive_gateway_nested_test';

    const initialToken = 1;

    const expectedResult = /nested left path/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, initialToken);

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('should direct the token through two nested exclusive gateways, taking the nested right path.', async () => {

    const processModelId = 'exclusive_gateway_nested_test';

    const initialToken = 2;

    const expectedResult = /nested right path/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, initialToken);

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('should not take the path through the nested gateways.', async () => {

    const processModelId = 'exclusive_gateway_nested_test';

    const initialToken = 'right';

    const expectedResult = /basic right path/i;

    const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, initialToken);

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('should fail to execute a gateway with mixed Split- and Join- purpose', async () => {

    try {
      const processModelId = 'exclusive_gateway_unsupported_test';
      const result = await testFixtureProvider.executeProcess(processModelId, startEventId, useAutoGeneratedCorrelationId, {});
      should.fail('error', result, 'This should have failed, because mixed gateways are not supported!');
    } catch (error) {
      const expectedErrorMessage = /not supported/i;
      const expectedErrorCode = 422;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to execute an ExclusiveGateway with multiple SequenceFlows with truthy conditions', async () => {

    try {
      const processModelId = 'exclusive_gateway_multiple_paths_test';
      const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_MultipleTruthy', useAutoGeneratedCorrelationId, {});
      should.fail('error', result, 'This should have failed, because more than one outgoing SequenceFlow returned true!');
    } catch (error) {
      const expectedErrorMessage = /more than one outgoing sequenceflow.*?had a truthy condition/i;
      const expectedErrorCode = 400;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to execute an ExclusiveGateway without any SequenceFlows with truthy conditions.', async () => {

    try {
      const processModelId = 'exclusive_gateway_multiple_paths_test';
      const result = await testFixtureProvider.executeProcess(processModelId, 'StartEvent_NoTruthy', useAutoGeneratedCorrelationId, {});
      should.fail('error', result, 'This should have failed, because more than one outgoing SequenceFlow returned true!');
    } catch (error) {
      const expectedErrorMessage = /no outgoing sequenceflow.*?had a truthy condition/i;
      const expectedErrorCode = 400;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });
});
