// Luật chơi Ma sói. Không phụ thuộc trình duyệt hay Firebase,
// dùng chung cho bot quản trò (Node) và chế độ thử trong trang web.
//
// "Backend" B là đối tượng có: get(path), set(path, value), update({path: value}), watch(path, cb).

export const ROLE_NAME = { wolf: 'Sói', seer: 'Tiên tri', guard: 'Bảo vệ', vill: 'Dân làng' };
export const DUR = { night: 45, day: 120, vote: 60 };   // giây (mặc định)
export const DAY_OPTIONS = [60, 120, 180, 300, 600];   // thời gian thảo luận ban ngày mà chủ phòng được chọn (giây), lưu ở room.dayTime
export const durOf = (room, ph) => ph === 'day' && DAY_OPTIONS.includes(room && room.dayTime) ? room.dayTime : DUR[ph];
export const MIN = 4, MAX = 12;
export const AGAIN_LOCK = 8;   // giây: hết ván phải chờ chừng này mới bấm được "Chơi ván mới" (để mọi người kịp xem kết quả, không bị một người bấm kéo cả phòng về phòng chờ)
export const LOBBY_WAIT = 60;   // giây: thiếu người mà không ai vào thêm thì tự thêm người máy
export const BOT_NAMES = ['Mít', 'Bơ', 'Na', 'Ổi', 'Xoài', 'Cam', 'Dừa', 'Lê', 'Mận', 'Nho', 'Khế', 'Sấu'];

// Thời điểm phòng chờ sẽ tự thêm người máy và bắt đầu, hoặc null nếu chưa đủ điều kiện:
// còn thiếu người (dưới MIN), có ít nhất 1 người thật và mọi người thật đều đã Sẵn sàng.
export function lobbyFillAt(room) {
  const pl = room && room.players ? room.players : {}, ids = Object.keys(pl);
  const humans = ids.filter(id => !pl[id].bot);
  if (!humans.length || ids.length >= MIN || !humans.every(id => pl[id].ready)) return null;
  return Math.max(...ids.map(id => Math.max(pl[id].t || 0, pl[id].readyAt || 0))) + LOBBY_WAIT * 1000;
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export function assignRoles(ids) {
  const n = ids.length, wolves = n <= 5 ? 1 : n <= 8 ? 2 : 3;
  const roles = Array(wolves).fill('wolf'); roles.push('seer'); if (n >= 6) roles.push('guard');
  while (roles.length < n) roles.push('vill');
  shuffle(roles); const out = {}; ids.forEach((id, i) => out[id] = roles[i]); return out;
}
export function tally(votes) {
  const c = {}; Object.values(votes || {}).forEach(t => { if (t) c[t] = (c[t] || 0) + 1; });
  const max = Math.max(0, ...Object.values(c));
  return { top: Object.keys(c).filter(k => c[k] === max), max };
}
/* ---------- Thành tích: mỗi ván kết thúc ghi một bản ghi meta/wg/<mã phòng>_<giờ> (ghi lặp lại vẫn cùng nội dung), bảng xếp hạng cộng dồn từ các bản ghi ---------- */
export const scoreKey = n => String(n || '').normalize('NFC').toLowerCase().trim().replace(/\s+/g, '_').replace(/[.$#\[\]\/]/g, '_').slice(0, 40);
export function gameRecord(room, win, now) {   // chỉ tính người thật, và ván phải có từ 2 người thật trở lên (chơi với người máy một mình không tính)
  const p = {}; let humans = 0;
  for (const [id, pl] of Object.entries(room.players || {})) {
    const r = (room.roles || {})[id]; if (pl.bot || !r) continue;
    humans++; p[scoreKey(pl.name) || id] = { n: pl.name, r };
  }
  return humans >= 2 ? { t: now, w: String(win).startsWith('Dân') ? 'vill' : 'wolf', p } : null;
}
export function tallyScores(wg) {   // -> mảng xếp hạng: nhiều ván thắng nhất đứng đầu, bằng nhau thì ai chơi nhiều hơn xếp trên
  const T = {};
  for (const rec of Object.values(wg || {})) {
    if (!rec || !rec.p) continue;
    for (const [k, x] of Object.entries(rec.p)) {
      const a = T[k] || (T[k] = { key: k, name: x.n, games: 0, wolf: 0, vill: 0, seer: 0, guard: 0, win: 0, loss: 0 });
      a.name = x.n; a.games++; if (a[x.r] != null) a[x.r]++;
      if ((x.r === 'wolf') === (rec.w === 'wolf')) a.win++; else a.loss++;
    }
  }
  return Object.values(T).sort((a, b) => b.win - a.win || b.games - a.games || String(a.name).localeCompare(String(b.name)));
}
export function winnerOf(players, roles, deadId) {
  const alive = Object.keys(players).filter(id => players[id].alive && id !== deadId);
  const wolves = alive.filter(id => roles[id] === 'wolf').length, others = alive.length - wolves;
  if (wolves === 0) return 'Dân làng thắng! Đã diệt hết Sói.';
  if (wolves >= others) return 'Sói thắng! Số Sói đã bằng hoặc hơn dân.';
  return null;
}
const aliveIds = room => Object.keys(room.players || {}).filter(id => room.players[id].alive);

/* ---------- Kế hoạch bước tiếp theo của một phòng ----------
   Trả về { u } với u là các khóa cập nhật tương đối so với rooms/<mã>/, hoặc null nếu chưa cần làm gì.
   Mọi giá trị là tuyệt đối (không tăng dần), nên chạy lặp hai lần vẫn ra cùng kết quả. */
// Lần cuối người này còn sống. Bot ghi lại GIỜ CỦA BOT lúc nó thấy nhịp tim đổi giá trị (room.seenAt) nên đồng hồ điện thoại lệch bao nhiêu cũng không sao;
// nơi nào không có seenAt (máy chủ phòng tự chạy luật) thì dùng giờ ghi trong nhịp tim như cũ.
const lastAlive = (room, id) => (room.seenAt && room.seenAt[id]) || (room.seen || {})[id] || (room.players[id] || {}).t || 0;
export const LOBBY_IDLE_MS = 10000;   // phòng chờ: 10 giây không có nhịp tim thì coi là đã thoát (máy gửi nhịp mỗi 3 giây; bị xóa nhầm thì tự vào lại)
export function planStep(room, now) {
  if (!room || !room.players) return null;

  // 1) Lệnh do người chơi gửi (bắt đầu / ván mới)
  if (room.cmd) {
    const c = room.cmd, ids = Object.keys(room.players);
    if (c.type === 'start' && room.phase === 'lobby' && ids.length >= MIN && ids.length <= MAX && (c.by === room.host || !room.players[room.host])) return startPlan(room, ids, now);
    if (c.type === 'again' && room.phase === 'end') return room.endedAt && now - room.endedAt < AGAIN_LOCK * 1000 ? { u: { cmd: null } } : againPlan(room);
    return { u: { cmd: null } };   // lệnh không hợp lệ: bỏ
  }

  // 2) Phòng chờ: đủ người và tất cả đã bấm "Sẵn sàng" thì tự bắt đầu
  if (room.phase === 'lobby') {
    // Người đã thoát (quá LOBBY_IDLE_MS không có nhịp tim) thì bị xóa khỏi danh sách phòng chờ
    const stale = Object.keys(room.players).filter(id => { const p = room.players[id]; return !p.bot && (!p.name || now - lastAlive(room, id) > LOBBY_IDLE_MS); });   // không tên = nút rác do bấm Sẵn sàng sau khi bị xóa
    const keep = Object.keys(room.players).filter(id => !stale.includes(id));
    if (stale.length && keep.some(id => !room.players[id].bot)) {
      const u = {};
      stale.forEach(id => { u['players/' + id] = null; u['seen/' + id] = null; });
      if (stale.includes(room.host)) u.host = keep.filter(id => !room.players[id].bot).sort((a, b) => (room.players[a].t || 0) - (room.players[b].t || 0))[0];
      return { u };
    }
    const ids = Object.keys(room.players);
    if (ids.length >= MIN && ids.length <= MAX && ids.every(id => room.players[id].ready)) return startPlan(room, ids, now);
    const at = lobbyFillAt(room);
    if (at && now >= at) {   // chờ đủ lâu mà vẫn thiếu người: thêm người máy cho đủ MIN rồi bắt đầu
      const used = ids.map(id => room.players[id].name), add = [];
      for (let i = 0; ids.length + add.length < MIN; i++) {
        const nm = '🤖 ' + (BOT_NAMES.find(x => !used.includes('🤖 ' + x)) || 'Bot' + i); used.push(nm);
        let id = 'bot_auto' + i; while (room.players[id]) id += 'x';
        add.push([id, nm]);
      }
      const plan = startPlan(room, ids.concat(add.map(a => a[0])), now);
      add.forEach(([id, nm]) => { delete plan.u['players/' + id + '/alive']; delete plan.u['players/' + id + '/ready']; plan.u['players/' + id] = { name: nm, alive: true, t: now, bot: true }; });
      return plan;
    }
    return null;
  }

  const expired = room.deadline && now >= room.deadline;
  if (room.phase === 'night') {
    const roles = room.roles || {}, n = room.night || {}, wv = n.wolf || {}, al = aliveIds(room);
    const wolves = al.filter(id => roles[id] === 'wolf');
    const seer = al.find(id => roles[id] === 'seer'), guard = al.find(id => roles[id] === 'guard');
    const all = wolves.length > 0 && wolves.every(id => wv[id]) && (!seer || n.seer) && (!guard || n.guard);
    if (all || expired) return nightPlan(room, now);
  } else if (room.phase === 'day') {
    const al = aliveIds(room), rd = room.ready || {};
    if ((al.length && al.every(id => rd[id])) || expired) {
      if (room.round === 0) return { u: { phase: 'night', round: 1, night: null, votes: null, ready: null, deadline: now + DUR.night * 1000, announce: 'Đêm 1 bắt đầu. Cả làng đi ngủ…' } };   // buổi sáng mở đầu: không bỏ phiếu, hết giờ là sang đêm 1
      return { u: { phase: 'vote', votes: null, ready: null, deadline: now + DUR.vote * 1000, announce: 'Mọi người bỏ phiếu chọn người bị treo cổ.' } };
    }
  } else if (room.phase === 'vote') {
    const al = aliveIds(room), v = room.votes || {};
    if ((al.length && al.every(id => v[id])) || expired) return votePlan(room, now);
  }
  return null;
}

function startPlan(room, ids, now) {
  const roles = assignRoles(ids), u = { cmd: null, phase: 'day', round: 0, night: null, votes: null, ready: null, botMem: null, seerLog: null, winner: null, log: null, endedAt: null, chat: null, deadline: now + durOf(room, 'day') * 1000, announce: 'Ván bắt đầu! Buổi sáng mở đầu: mọi người làm quen và trò chuyện với nhau. Hết giờ thì trời tối, Đêm 1 bắt đầu.' };   // mở đầu bằng một buổi sáng nói chuyện (không bỏ phiếu) rồi mới sang đêm 1
  ids.forEach(id => { u['roles/' + id] = roles[id]; u['players/' + id + '/alive'] = true; u['players/' + id + '/ready'] = null; });
  return { u };
}
function againPlan(room) {
  const u = { cmd: null, phase: 'lobby', round: 0, roles: null, night: null, votes: null, ready: null, botMem: null, seerLog: null, winner: null, log: null, endedAt: null, chat: null, announce: null, deadline: null };
  Object.entries(room.players || {}).forEach(([id, p]) => { u['players/' + id + '/alive'] = true; u['players/' + id + '/ready'] = p.bot ? true : null; });   // bot luôn sẵn sàng
  return { u };
}
const logKey = n => String(n).padStart(3, '0');   // nhật ký diễn biến: 001 = đêm 1, 002 = ngày 1, ...
function nightPlan(room, now) {
  const players = room.players, roles = room.roles || {}, r = room.round, n = room.night || {}, al = aliveIds(room);
  const wv = {};   // chỉ tính phiếu của Sói còn sống nhắm vào người còn sống
  Object.entries(n.wolf || {}).forEach(([id, t]) => { if (al.includes(id) && roles[id] === 'wolf' && players[t] && players[t].alive) wv[id] = t; });
  const t = tally(wv), target = t.top.length && t.max > 0 ? t.top[Math.floor(Math.random() * t.top.length)] : null;
  const guardAlive = al.some(id => roles[id] === 'guard');
  const saved = !!(target && guardAlive && n.guard === target);
  const seerId = al.find(id => roles[id] === 'seer');
  const u = { night: null, votes: null, ready: null };
  if (seerId && n.seer && players[n.seer]) u['seerLog/' + r] = `Đêm ${r}: ${players[n.seer].name} ${roles[n.seer] === 'wolf' ? 'LÀ SÓI' : 'không phải Sói'}.`;
  let dead = null, announce, note;   // announce: thông báo đầu trang; note: dòng ngắn trong nhật ký diễn biến
  if (!target || saved) { announce = 'Đêm qua yên bình, không ai chết.'; note = 'Không ai chết.'; }
  else { dead = target; u['players/' + dead + '/alive'] = false; announce = `Đêm qua ${players[dead].name} đã bị Sói cắn chết.`; note = `${players[dead].name} bị Sói cắn chết.`; }
  const win = winnerOf(players, roles, dead);
  if (win) { u.phase = 'end'; u.winner = win; u.deadline = null; } else { u.phase = 'day'; u.deadline = now + durOf(room, 'day') * 1000; }
  u.announce = announce; u['log/' + logKey(2 * r - 1)] = note;
  if (win) { u.endedAt = now; u['log/999'] = '🏁 ' + win; }
  return { u, g: win ? gameRecord(room, win, now) : null };
}
function votePlan(room, now) {
  const players = room.players, roles = room.roles || {}, r = room.round, al = aliveIds(room);
  const v = {}; Object.entries(room.votes || {}).forEach(([id, t]) => { if (al.includes(id) && players[t] && players[t].alive) v[id] = t; });
  const t = tally(v), u = { night: null, votes: null, ready: null };
  let dead = null, announce, note;
  if (t.top.length === 1 && t.max > 0) { dead = t.top[0]; u['players/' + dead + '/alive'] = false; announce = `Làng treo cổ ${players[dead].name}${room.hideRoles ? '.' : ` (${ROLE_NAME[roles[dead]]}).`}`;   /* hideRoles: chế độ không lộ vai khi chết */ }
  else announce = 'Phiếu hòa hoặc không ai bỏ phiếu, hôm nay không ai bị treo cổ.';
  note = dead ? announce : 'Hòa phiếu, không ai bị treo cổ.';
  const win = winnerOf(players, roles, dead);
  u['log/' + logKey(2 * r)] = note;
  if (win) { u.phase = 'end'; u.winner = win; u.announce = announce; u.deadline = null; u.endedAt = now; u['log/999'] = '🏁 ' + win; }
  else { u.phase = 'night'; u.round = r + 1; u.announce = announce + `\nĐêm ${r + 1} bắt đầu…`; u.deadline = now + DUR.night * 1000; }
  return { u, g: win ? gameRecord(room, win, now) : null };
}

/* ---------- Bot người chơi (người máy) ----------
   Người chơi có cờ bot:true tự hành động theo luật đơn giản, sau một độ trễ ngẫu nhiên cho giống người.
   Độ trễ tính từ giờ bắt đầu bước (deadline - thời lượng) và một giá trị băm theo tên + vòng,
   nên không cần lưu thêm trạng thái và chạy lặp vẫn cho cùng kết quả. */
const hash = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return ((x >>> 0) % 10000) / 10000; };
const hpick = (arr, seed) => arr[Math.floor(hash(seed) * arr.length)];

export function planBots(room, now) {
  if (!room || !room.players || !room.roles || !room.deadline || !DUR[room.phase]) return null;
  const al = aliveIds(room), roles = room.roles, r = room.round, ph = room.phase;
  const bots = al.filter(id => room.players[id].bot); if (!bots.length) return null;
  const el = now - (room.deadline - durOf(room, ph) * 1000), mem = room.botMem || {}, u = {};
  if (ph === 'night') {
    const n = room.night || {};
    for (const b of bots) {
      if (el < 3000 + hash(b + 'n' + r) * 15000) continue;
      if (roles[b] === 'wolf' && !(n.wolf || {})[b]) {
        const c = al.filter(id => roles[id] !== 'wolf'); if (c.length) u['night/wolf/' + b] = hpick(c, 'wolf' + r);   // Sói máy cùng chọn một mục tiêu
      } else if (roles[b] === 'seer' && !n.seer) {
        const checked = (mem[b] || {}).checked || {}, others = al.filter(id => id !== b), fresh = others.filter(id => !checked[id]);
        const t = hpick(fresh.length ? fresh : others, b + 'seer' + r); if (t) { u['night/seer'] = t; u['botMem/' + b + '/checked/' + t] = roles[t] === 'wolf' ? 'wolf' : 'ok'; }
      } else if (roles[b] === 'guard' && !n.guard) {
        const last = (mem[b] || {}).last, c = al.filter(id => id !== last), t = hpick(c.length ? c : al, b + 'guard' + r);
        if (t) { u['night/guard'] = t; u['botMem/' + b + '/last'] = t; }
      }
    }
  } else if (ph === 'day') {
    const rd = room.ready || {};
    for (const b of bots) if (!rd[b] && el >= 10000 + hash(b + 'd' + r) * 40000) u['ready/' + b] = true;
  } else if (ph === 'vote') {
    const v = room.votes || {}, lead = tally(v);
    for (const b of bots) {
      if (v[b] || el < 4000 + hash(b + 'v' + r) * 26000) continue;
      let c = al.filter(id => id !== b && !(roles[b] === 'wolf' && roles[id] === 'wolf')); if (!c.length) continue;
      const known = Object.entries((mem[b] || {}).checked || {}).find(([id, x]) => x === 'wolf' && c.includes(id));
      let t;
      if (known) t = known[0];                                                             // Tiên tri máy bỏ phiếu cho Sói đã soi ra
      else { const hot = lead.top.filter(id => c.includes(id)); t = hot.length && hash(b + 'bw' + r) < 0.5 ? hot[0] : hpick(c, b + 'vote' + r); }
      u['votes/' + b] = t;
    }
  }
  return Object.keys(u).length ? { u } : null;
}

export const planAll = (room, now) => planStep(room, now) || planBots(room, now);

/* ---------- Chạy một bước cho một phòng ---------- */
export async function stepRoom(B, code, room, now) {
  const plan = planAll(room, now); if (!plan) return false;
  const u = {}; for (const [k, v] of Object.entries(plan.u)) u['rooms/' + code + '/' + k] = v;
  if (plan.g) u['meta/wg/' + code + '_' + plan.g.t] = plan.g;   // ván kết thúc: ghi thành tích
  await B.update(u); return true;
}

/* ---------- Bot quản trò: theo dõi mọi phòng, chạy luật, dọn phòng cũ ---------- */
export function runBot(B, { log = console.log, now = () => Date.now(), maxAgeMs = 12 * 3600 * 1000 } = {}) {
  let rooms = {}, caroRooms = {}; const busy = {};
  const track = {};   // track[mã][pid] = { v: giá trị nhịp tim lần trước, at: giờ bot thấy nó đổi }
  const withSeenAt = (code, room) => {
    if (!room || !room.players) return room;
    const t = track[code] || (track[code] = {}), seenAt = {}, nw = now();
    for (const id of Object.keys(room.players)) {
      const v = (room.seen || {})[id], o = t[id];
      if (!o) t[id] = { v, at: nw }; else if (o.v !== v) { o.v = v; o.at = nw; }
      seenAt[id] = t[id].at;
    }
    for (const id of Object.keys(t)) if (!(id in room.players)) delete t[id];
    return { ...room, seenAt };
  };
  const tick = async () => {
    for (const [code, room] of Object.entries(caroRooms || {})) {   // dọn phòng cờ caro quá cũ
      if (room && room.createdAt && now() - room.createdAt > maxAgeMs && !busy['caro' + code]) {
        busy['caro' + code] = true; try { await B.set('caro/' + code, null); log('Xóa phòng caro cũ', code); } finally { busy['caro' + code] = false; }
      }
    }
    for (const [code, raw] of Object.entries(rooms || {})) {
      const room = withSeenAt(code, raw);
      if (busy[code]) continue;
      if (room && room.createdAt && now() - room.createdAt > maxAgeMs) { busy[code] = true; try { await B.set('rooms/' + code, null); log('Xóa phòng cũ', code); } finally { busy[code] = false; } continue; }
      if (!planAll(room, now())) continue;
      busy[code] = true;
      try { if (await stepRoom(B, code, room, now())) log(new Date().toLocaleTimeString(), 'phòng', code, '→ bước tiếp'); }
      catch (e) { log('Lỗi phòng', code, e && e.message); }
      finally { busy[code] = false; }
    }
  };
  const unwatch = B.watch('rooms', v => { rooms = v || {}; tick(); });
  const unwatch2 = B.watch('caro', v => { caroRooms = v || {}; });
  const iv = setInterval(tick, 1000);
  const beat = () => B.set('meta/botBeat', now()).catch(() => {});
  beat(); const iv2 = setInterval(beat, 5000);
  return () => { clearInterval(iv); clearInterval(iv2); if (unwatch) unwatch(); if (unwatch2) unwatch2(); };
}
