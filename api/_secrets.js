/**
 * _secrets.js — Central Server Secrets & Fragment Definitions
 * Operation Black Beacon CTF
 * Private module used by serverless functions and local server.
 */

const crypto = require('crypto');

const FRAGMENTS = {
  1: ['SPARROW{anchor_in_the_deep}', 'VANE{anchor_in_the_deep}'],
  2: ['SPARROW{ghost_ship_indexed}', 'VANE{ghost_ship_indexed}'],
  3: ['SPARROW{pixel_by_pixel_truth}', 'VANE{pixel_by_pixel_truth}']
};

const PASSPHRASES = {
  strongbox: 'BEACONRED'
};

const COMBINED = FRAGMENTS[1][0] + FRAGMENTS[2][0] + FRAGMENTS[3][0];
const MASTER_HASH = crypto.createHash('sha256').update(COMBINED).digest('hex');
const MASTER_FLAG = 'SPARROW{' + MASTER_HASH.substring(0, 16) + '}';

const LEGACY_COMBINED = FRAGMENTS[1][1] + FRAGMENTS[2][1] + FRAGMENTS[3][1];
const LEGACY_HASH = crypto.createHash('sha256').update(LEGACY_COMBINED).digest('hex');
const LEGACY_MASTER_FLAG = 'VANE{' + LEGACY_HASH.substring(0, 16) + '}';

module.exports = {
  FRAGMENTS,
  PASSPHRASES,
  MASTER_FLAG,
  LEGACY_MASTER_FLAG
};
