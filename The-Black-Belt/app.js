'use strict';
const metrics = [
  ['hr','Heart rate','bpm',1,300,'Record the measurement context and review repeated changes with your crew medical officer.'],
  ['temp','Wrist temperature','°C',0,60,'Compare readings taken under similar conditions. Wrist temperature measures the skin.'],
  ['activity','Exercise','min',0,1440,'Log completed exercise according to the mission schedule.'],
  ['sleep','Sleep','h',0,24,'Review sleep alongside the duty schedule and note interrupted rest.'],
  ['stress','Perceived stress','/ 5',1,5,'Use this self-reported score to start a check-in with the crew medical officer when needed.'],
  ['sys','Systolic BP','mmHg',1,350,'Record readings from a validated cuff and follow the mission measurement protocol.'],
  ['dia','Diastolic BP','mmHg',1,350,'Record both numbers from the same cuff reading.']
];
const demo = [
  [68,33.1,42,7.6,2,116,74],[70,33.3,50,7.2,2,118,75],[67,33.2,54,7.8,1,114,73],
  [73,33.4,38,6.7,3,119,76],[71,33.1,58,7,2,117,74],[69,33.3,45,7.5,2,115,73],
  [72,33.5,52,7.1,2,118,76]
].map((values,index)=>({
  time: new Date(Date.UTC(2026,8,index+1,12)).toISOString(),
  values: Object.fromEntries(metrics.map(([key],i)=>[key,values[i]]))
}));
const el = id => document.getElementById(id);
const storageKey = 'black-belt.checkins.v1';
const mode = el('mode');
const metric = el('metric');
const dialog = el('dialog');
const tableDate = new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'});
let local = [];
let storageIssue = '';
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (!Array.isArray(saved) || saved.some(r => !r || !Number.isFinite(Date.parse(r.time)) ||
      !r.values || metrics.some(([key,,,min,max]) => Object.hasOwn(r.values,key) &&
      (!Number.isFinite(r.values[key]) || r.values[key]<min || r.values[key]>max)))) {
    throw new Error('Invalid stored record');
  }
  local = saved;
} catch {
  storageIssue = 'Saved records could not be read. Saving is disabled to protect existing data.';
}
function append(parent,tag,label) {
  const child = document.createElement(tag);
  child.textContent = label;
  parent.append(child);
  return child;
}
append(el('columns'),'th','Time');
for (const [key,name,unit,min,max] of metrics) {
  append(metric,'option',name).value = key;
  append(el('columns'),'th',name+' ('+unit+')');
  const label = append(el('fields'),'label',name+' ('+unit+')');
  const input = append(label,'input','');
  Object.assign(input,{name:key,type:'number',min,max,step:key==='stress'?'1':'any'});
}
const records = () => mode.value === 'demo' ? demo : local;
function render() {
  const data = records();
  const current = metrics.find(([key])=>key===metric.value);
  el('status').textContent = mode.value==='demo' ? 'Illustrative data · 7 check-ins' :
    storageIssue || data.length+' check-ins · Stored in this browser';
  el('open').disabled = Boolean(storageIssue);
  el('export').disabled = !data.length;
  el('cards').replaceChildren();
  for (const [key,name,unit] of metrics) {
    const button = append(el('cards'),'button','');
    button.className = 'card';
    button.setAttribute('aria-pressed',String(key===metric.value));
    const latest = data.findLast(r=>Object.hasOwn(r.values,key));
    append(button,'span',name);
    append(button,'strong',latest ? String(latest.values[key])+' '+unit : '—');
    append(button,'span',latest ? tableDate.format(new Date(latest.time)) : 'Awaiting check-in');
    button.onclick = () => { metric.value=key; render(); el('cards').children[metrics.findIndex(m=>m[0]===key)].focus(); };
  }
  el('rows').replaceChildren();
  for (const entry of data.slice().reverse()) {
    const row = append(el('rows'),'tr','');
    append(row,'td',tableDate.format(new Date(entry.time)));
    for (const [key] of metrics) append(row,'td',String(entry.values[key] ?? '—'));
  }
  if (!data.length) {
    append(append(el('rows'),'tr',''),'td','No check-ins yet').colSpan=metrics.length+1;
  }
  const points = data.filter(r=>Object.hasOwn(r.values,current[0])).slice(-14)
    .map(r=>({time:Date.parse(r.time),value:r.values[current[0]]}));
  const previous = points.slice(0,-1).map(p=>p.value);
  el('baseline').textContent = previous.length>=3
    ? 'Prior '+previous.length+' readings averaged '+(previous.reduce((a,b)=>a+b,0)/previous.length).toFixed(1)+' '+current[2]+'.'
    : 'Add at least four readings to compare with a prior average.';
  el('guidance').textContent = current[5];
  draw(points,current[2]);
}
function draw(points,unit) {
  const canvas = el('chart');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0,0,720,240);
  ctx.font='15px system-ui';
  ctx.fillStyle='#a9bad0';
  if (!points.length) { ctx.fillText('No readings for this indicator',25,110); return; }
  const values = points.map(p=>p.value);
  const pad = Math.max((Math.max(...values)-Math.min(...values))*.16,.1);
  const lo = Math.min(...values)-pad;
  const hi = Math.max(...values)+pad;
  const start = points[0].time;
  const duration = points.at(-1).time-start;
  const xy = p => [96+(duration ? (p.time-start)/duration*600 : 300),184-(p.value-lo)/(hi-lo)*152];
  for (let i=0;i<4;i++) {
    const y=32+i*152/3;
    ctx.fillText((hi-i*(hi-lo)/3).toFixed(1),10,y+5);
    ctx.strokeStyle='#2a3d55';
    ctx.beginPath();ctx.moveTo(92,y);ctx.lineTo(700,y);ctx.stroke();
  }
  ctx.fillText(unit,10,213);
  ctx.fillText(new Date(start).toLocaleDateString(),96,213);
  if (duration) {
    const end = new Date(points.at(-1).time).toLocaleDateString();
    ctx.fillText(end,696-ctx.measureText(end).width,213);
  }
  ctx.strokeStyle='#73ead0';ctx.lineWidth=3;ctx.beginPath();
  points.forEach((p,i)=>{const [x,y]=xy(p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
  ctx.stroke();ctx.lineWidth=1;ctx.fillStyle='#73ead0';
  points.forEach(p=>{const [x,y]=xy(p);ctx.beginPath();ctx.arc(x,y,5,0,2*Math.PI);ctx.fill();});
}
mode.onchange = metric.onchange = render;
el('open').onclick = () => { el('error').textContent='';dialog.showModal(); };
el('cancel').onclick = () => dialog.close();
el('entry').onsubmit = event => {
  event.preventDefault();
  const values = Object.fromEntries([...new FormData(event.currentTarget)]
    .filter(([,value])=>value!=='').map(([key,value])=>[key,Number(value)]));
  if (!Object.keys(values).length) {el('error').textContent='Enter at least one reading.';return;}
  if (('sys' in values || 'dia' in values) && !(values.sys>values.dia)) {
    el('error').textContent='Enter both cuff readings, with systolic above diastolic.';return;
  }
  try {
    const latest = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (JSON.stringify(latest)!==JSON.stringify(local)) throw new Error('Records changed');
    const next = [...local,{time:new Date().toISOString(),values}].sort((a,b)=>a.time.localeCompare(b.time));
    localStorage.setItem(storageKey,JSON.stringify(next));
    local = next;
  } catch {
    el('error').textContent='Could not save. Check browser storage and reload if another tab changed the records.';return;
  }
  mode.value='local';event.currentTarget.reset();dialog.close();render();
};
el('export').onclick = () => {
  const lines = [['source','timestamp_utc',...metrics.map(([key])=>key)],
    ...records().map(r=>[mode.value,r.time,...metrics.map(([key])=>r.values[key]??'')])];
  const url=URL.createObjectURL(new Blob([lines.map(line=>line.join(',')).join('\r\n')],{type:'text/csv'}));
  const link=document.createElement('a');
  link.href=url;link.download='black-belt-'+mode.value+'.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
render();
