'use strict';

// Explicit opt-in only. Run against the task-owned, tmpfs Docker replica set.
// Never use this preload with a shared developer/staging/production database.
const expected = 'mongodb://127.0.0.1:27028/atelier_acceptance_c085454b_test?directConnection=true&replicaSet=rs0';
if (process.env.NODE_ENV !== 'test' || process.env.SFA_ISOLATED_ACCEPTANCE !== 'c085454b' || process.env.MONGO_URI_TEST !== expected) {
  throw new Error('Isolated acceptance requires the verified task-owned loopback replica set.');
}
// app.js uses dotenv.config(); fixture processes must never load real credentials.
const dotenv = require('dotenv');
dotenv.config = dotenv.configDotenv = () => ({
  parsed: {}
});
const mongoose = require('mongoose');
const connect = mongoose.connect.bind(mongoose);
mongoose.connect = (uri, ...args) => {
  if (uri !== expected) throw new Error('Unexpected MongoDB target blocked.');
  return connect(uri, ...args);
};
const local = host => ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(String(host).toLowerCase());
const net = require('node:net');
const socketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const host = typeof first === 'object' ? first.host || first.hostname || 'localhost' : typeof args[1] === 'string' ? args[1] : 'localhost';
  if (!local(host)) throw new Error('External network transport blocked during isolated acceptance.');
  return socketConnect.apply(this, args);
};
const fetchLocal = globalThis.fetch;
globalThis.fetch = (input, ...args) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!local(url.hostname)) throw new Error('External HTTP transport blocked during isolated acceptance.');
  return fetchLocal(input, ...args);
};
// Mock at the established notification transport boundaries; no worker starts.
require('../../services/mail/mailService').sendMail = async () => ({
  provider: 'test',
  status: 'accepted',
  id: 'mock-only'
});
const sms = {
  calls: 0,
  lastCode: ''
};
module.exports.sms = sms;
require('../../services/sms/smsProviderService').sendSms = async ({
  message
}) => {
  sms.calls++;
  sms.lastCode = String(message).match(/\b(\d{6})\b/)?.[1] || '';
  return {
    success: true,
    status: 'accepted',
    providerResponse: {
      id: 'mock-only'
    }
  };
};
const Module = require('node:module');
const load = Module._load;
Module._load = function (id, parent, ...args) {
  if (/(?:^|[\\/])workers[\\/]index(?:\.js)?$/.test(String(id))) throw new Error('Worker startup blocked in isolated acceptance.');
  return load.call(this, id, parent, ...args);
};
