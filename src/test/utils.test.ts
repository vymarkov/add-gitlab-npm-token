import * as assert from 'assert';
import { validateGitlabAccessToken, validateGitlabNPMToken } from '../utils/gitlab';

const logger = console

suite('Extension Test Suite', () => {
  suite('#validateGitlabAccessToken', async () => {
    suite('pass valid gitlab url instance and fake gitlab token', () => {
      test('should return false', async () => {
        assert.strictEqual(await validateGitlabAccessToken(logger, 'https://gitlab.com', 'foobar'), false)
      })
    })

    suite('pass fake gitlab url instance and gitlab token', () => {
      test('should return false', async () => {
        assert.strictEqual(await validateGitlabAccessToken(console, 'https://fake.gitlab.instnce.com', 'foobar'), false)
      })
    })
  })

  suite.only('#validateGitlabNPMToken', () => {
    suite('pass valid gitlab npm token', async () => {
      assert.strictEqual((await validateGitlabNPMToken(console, 'https://gitlab.com', 'foobar', 1)).isValid, false)
    })
  })

});
