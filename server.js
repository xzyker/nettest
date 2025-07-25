const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;
let iperfServer = null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Start iperf3 server
app.post('/start-server', (req, res) => {
  if (iperfServer) {
    return res.status(400).json({ error: 'Server already running' });
  }

  iperfServer = spawn('iperf3', ['-s']);

  iperfServer.stdout.on('data', data => console.log(`[iperf3 stdout]: ${data}`));
  iperfServer.stderr.on('data', data => console.error(`[iperf3 stderr]: ${data}`));

  iperfServer.on('close', code => {
    console.log(`[iperf3 server closed with code ${code}]`);
    iperfServer = null;
  });

  return res.json({ message: 'iperf3 server started successfully' });
});

// Stop iperf3 server
app.post('/stop-server', (req, res) => {
  if (!iperfServer) {
    return res.status(400).json({ error: 'Server is not running' });
  }

  iperfServer.kill();
  return res.json({ message: 'iperf3 server stopped' });
});

// Advanced Throughput Test
app.post('/run-test', (req, res) => {
  const {
    serverIP, protocol, time, bandwidth, mtu,
    bufferLength, parallel, reverse, windowSize
  } = req.body;

  const args = ['-c', serverIP];
  if (protocol === 'UDP') args.push('-u');
  if (time) args.push('-t', time);
  if (bandwidth) args.push('-b', bandwidth);
  if (mtu) args.push('--set-mss', mtu);
  if (bufferLength) args.push('-l', bufferLength);
  if (parallel) args.push('-P', parallel);
  if (reverse === 'true') args.push('-R');
  if (windowSize) args.push('-w', windowSize);

  let output = '', errorOutput = '';
  setTimeout(() => {
    const test = spawn('iperf3', args);
    test.stdout.on('data', data => output += data.toString());
    test.stderr.on('data', data => errorOutput += data.toString());
    test.on('close', () => res.json({ raw: output + errorOutput }));
  }, 1000);
});

// Basic Throughput Test
app.post('/run-basic-test', (req, res) => {
  const { serverIP, type, reverse } = req.body;

  const args = ['-c', serverIP, '-i', '1'];
  if (type === 'UDP') {
    args.push('-u', '-l', '1400', '-b', '1200M', '-t', '10');
  } else {
    args.push('-t', '10', '-w', '256K');
  }
  if (reverse === 'true') args.push('-R');

  let output = '', errorOutput = '';
  const test = spawn('iperf3', args);
  test.stdout.on('data', data => output += data.toString());
  test.stderr.on('data', data => errorOutput += data.toString());
  test.on('close', () => res.json({ raw: output + errorOutput }));
});

// Latency Test (Ping)
app.post('/run-ping-test', (req, res) => {
  const { serverIP, duration } = req.body;
  const count = Math.ceil(Number(duration) || 5); // fallback: 5 pings

  const ping = spawn('ping', ['-c', count.toString(), serverIP]);

  let output = '';
  ping.stdout.on('data', data => output += data.toString());
  ping.stderr.on('data', data => output += data.toString());

  ping.on('close', () => res.json({ raw: output }));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
