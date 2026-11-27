// Luật chơi Ma sói. Không phụ thuộc trình duyệt hay Firebase,
// dùng chung cho bot quản trò (Node) và chế độ thử trong trang web.
//
// "Backend" B là đối tượng có: get(path), set(path, value), update({path: value}), watch(path, cb).

export const ROLE_NAME = { wolf: 'Sói', seer: 'Tiên tri', guard: 'Bảo vệ', witch: 'Phù thủy', hunter: 'Thợ săn', chief: 'Trưởng làng', vill: 'Dân làng', sister: 'Chị em', cupid: 'Cupid', knight: 'Hiệp sĩ', pup: 'Sói con', whitewolf: 'Sói trắng', halfwolf: 'Nửa người nửa sói' };
// Vai thêm (chủ phòng bật ở phòng chờ, mặc định tắt hết). min = số người tối thiểu; take = số chỗ Dân bị thay; wolves = số Sói tối thiểu của ván (vai này thay một Sói).
export const EXTRA_ORDER = ['sister', 'halfwolf', 'cupid', 'knight', 'pup', 'whitewolf'];
export const EXTRA_ROLES = {
  sister: { min: 9, take: 2, icon: '👭', desc: 'Hai Dân biết rõ nhau là chị em, ban đêm nhắn riêng được với nhau, không có khả năng gì khác.' },
  halfwolf: { min: 8, take: 1, icon: '🌗', desc: 'Ban đầu là Dân. Bị Sói cắn thì không chết mà hóa thành Sói.' },
  cupid: { min: 9, take: 1, icon: '💘', desc: 'Đêm 1 ghép hai người thành cặp đôi, một người chết thì người kia chết theo. Ghép Dân với Sói thì hai người thành phe thứ ba.' },
  knight: { min: 10, take: 1, icon: '⚔️', desc: 'Bị Sói cắn chết thì một con Sói trong bầy (đã bỏ phiếu cắn mình) sẽ chết sau 2 đêm. Cả bầy Sói được báo rõ vì sao Sói đó chết.' },
  pup: { min: 7, wolves: 2, icon: '🐶', desc: 'Sói con chết (bất kỳ lý do gì) thì đêm sau bầy Sói được cắn 2 người.' },
  whitewolf: { min: 10, wolves: 3, icon: '🤍', desc: 'Chơi cùng bầy Sói nhưng thắng một mình. Từ đêm 3, cách một đêm được cắn trộm một Sói. Thắng khi sống sót cuối cùng.' },
};
export const MAX_EXTRA_VILL_LEFT = 0;   // vai thêm chỉ thay vào chỗ Dân thường; sau khi thêm phải còn ít nhất chừng này Dân thường (0 = được dùng hết)
export const wolvesFor = n => n <= 5 ? 1 : n <= 8 ? 2 : n <= 12 ? 3 : n <= 16 ? 4 : 5;
// Xét các vai thêm chủ phòng chọn với n người chơi -> { ok: [vai dùng được], bad: { vai: lý do } }
export function rolePlan(n, picks) {
  const want = EXTRA_ORDER.filter(k => (picks || []).includes(k)), ok = [], bad = {};
  const wolves = wolvesFor(n);
  let vill = n - wolves - 1 - (n >= 6 ? 1 : 0) - (n >= 7 ? 1 : 0) - (n >= 8 ? 1 : 0) - (n >= 10 ? 1 : 0), plain = wolves;
  for (const k of want) {
    const d = EXTRA_ROLES[k], nm = ROLE_NAME[k];
    if (n < d.min) { bad[k] = `${nm} cần ít nhất ${d.min} người (phòng đang có ${n}).`; continue; }
    if (d.take) { if (vill - d.take < MAX_EXTRA_VILL_LEFT) { bad[k] = `${nm}: không còn đủ chỗ Dân để thay (đã có các vai thêm khác chiếm hết).`; continue; } vill -= d.take; }
    else { if (wolves < d.wolves || plain < 2) { bad[k] = `${nm} cần ván có ít nhất ${d.wolves} Sói và còn Sói thường.`; continue; } plain--; }
    ok.push(k);
  }
  return { ok, bad };
}
export const startBlock = room => {   // lý do chưa bắt đầu được (vai thêm chủ phòng chọn chưa đủ điều kiện), hoặc ''
  const n = Object.keys((room && room.players) || {}).length, bad = Object.values(rolePlan(n, extraPicks(room)).bad);
  return bad.length ? bad.join(' ') : '';
};
export const extraPicks = room => EXTRA_ORDER.filter(k => room && room.extraRoles && room.extraRoles[k]);   // các vai thêm chủ phòng đã bật
// Bầy Sói (cùng cắn ban đêm): Sói, Sói con, Sói trắng, và Nửa người nửa sói đã hóa Sói
export const isWolfRole = r => r === 'wolf' || r === 'pup' || r === 'whitewolf';
export const inPack = (room, id) => !!room && (isWolfRole((room.roles || {})[id]) || !!(room.turned || {})[id]);
export const coupleOf = room => room && room.couple && room.couple.a && room.couple.b && room.couple.a !== room.couple.b ? [room.couple.a, room.couple.b] : null;
export const wwAllowed = room => {   // đêm nay Sói trắng có quyền cắn trộm một Sói: từ đêm 3, cách một đêm, và còn Sói khác để cắn
  const roles = room.roles || {}, al = aliveIds(room), r = room.round;
  const noVill = !al.some(id => !inPack(room, id));   // chỉ còn bầy Sói với nhau: đêm nào Sói trắng cũng được cắn (để ván không bị kẹt)
  return r >= 3 && ((r - 3) % 2 === 0 || noVill) && al.some(id => roles[id] === 'whitewolf') && al.some(id => inPack(room, id) && roles[id] !== 'whitewolf');
};
export const KNIGHT_DELAY = 2;   // số đêm từ lúc Hiệp sĩ bị cắn chết đến lúc Sói trúng kiếm độc chết
export const LOVE_CHAT = 15;   // giây cặp đôi được nói chuyện riêng sau khi Cupid ghép (đêm 1)
export const WITCH_EXTRA = 10;   // giây cộng thêm cho Phù thủy khi Sói đã chốt mục tiêu
export const DUR = { night: 30, day: 120, vote: 60, hunter: 20, tie: 10 };   // giây (mặc định)
export const DAY_OPTIONS = [60, 120, 180, 300, 600];   // thời gian thảo luận ban ngày mà chủ phòng được chọn (giây), lưu ở room.dayTime
export const NIGHT_OPTIONS = [20, 30, 45, 60, 90];   // thời gian ban đêm (cả Sói chọn mục tiêu) mà chủ phòng được chọn, lưu ở room.nightTime
export const durOf = (room, ph) => ph === 'day' && DAY_OPTIONS.includes(room && room.dayTime) ? room.dayTime : ph === 'night' && NIGHT_OPTIONS.includes(room && room.nightTime) ? room.nightTime : DUR[ph];
export const MIN = 4, MAX = 20;
export const CAP_OPTIONS = [12, 15, 20];   // chủ phòng chọn số người chơi tối đa của phòng (mặc định 20)
export const capOf = room => room && CAP_OPTIONS.includes(room.maxPlayers) ? room.maxPlayers : MAX;
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

export function assignRoles(ids, extras = []) {
  const n = ids.length, wolves = wolvesFor(n);
  const roles = Array(wolves).fill('wolf'); roles.push('seer'); if (n >= 6) roles.push('guard'); if (n >= 7) roles.push('chief'); if (n >= 8) roles.push('witch'); if (n >= 10) roles.push('hunter');   // đông người thì thêm Phù thủy (từ 8), Thợ săn (từ 10)
  while (roles.length < n) roles.push('vill');
  for (const k of rolePlan(n, extras).ok) {   // vai thêm: thay Dân (hoặc thay một Sói)
    const d = EXTRA_ROLES[k];
    if (d.take) for (let i = 0; i < d.take; i++) roles[roles.lastIndexOf('vill')] = k === 'sister' ? 'sister' : k;
    else roles[roles.lastIndexOf('wolf')] = k;
  }
  shuffle(roles); const out = {}; ids.forEach((id, i) => out[id] = roles[i]); return out;
}
export function tally(votes, weight = () => 1) {   // weight(người bỏ phiếu) = số phiếu của người đó (Trưởng làng được 2)
  const c = {}; Object.entries(votes || {}).forEach(([voter, t]) => { if (t) c[t] = (c[t] || 0) + weight(voter); });
  const max = Math.max(0, ...Object.values(c));
  return { top: Object.keys(c).filter(k => c[k] === max), max };
}
/* ---------- Thành tích: mỗi ván kết thúc ghi một bản ghi meta/wg/<mã phòng>_<giờ> (ghi lặp lại vẫn cùng nội dung), bảng xếp hạng cộng dồn từ các bản ghi ---------- */
export const scoreKey = n => String(n || '').normalize('NFC').toLowerCase().trim().replace(/\s+/g, '_').replace(/[.$#\[\]\/]/g, '_').slice(0, 40);
const winKey = win => { const w = String(win); return w.startsWith('Dân') ? 'vill' : w.startsWith('Cặp đôi') ? 'love' : w.startsWith('Sói trắng') ? 'white' : 'wolf'; };
function sideOf(room, id) {   // phe của người này khi ván kết thúc: vill | wolf | love (cặp đôi khác phe) | white
  const c = coupleOf(room);
  if (c && c.includes(id) && inPack(room, c[0]) !== inPack(room, c[1])) return 'love';
  return (room.roles || {})[id] === 'whitewolf' ? 'white' : inPack(room, id) ? 'wolf' : 'vill';
}
export function gameRecord(room, win, now) {   // chỉ tính người thật, và ván phải có từ 2 người thật trở lên (chơi với người máy một mình không tính)
  const p = {}; let humans = 0;
  for (const [id, pl] of Object.entries(room.players || {})) {
    const r = (room.roles || {})[id]; if (pl.bot || !r) continue;
    humans++; p[scoreKey(pl.name) || id] = { n: pl.name, r, s: sideOf(room, id) };
  }
  return humans >= 2 ? { t: now, w: winKey(win), p } : null;
}
export function tallyScores(wg) {   // -> mảng xếp hạng: nhiều ván thắng nhất đứng đầu, bằng nhau thì ai chơi nhiều hơn xếp trên
  const T = {};
  for (const rec of Object.values(wg || {})) {
    if (!rec || !rec.p) continue;
    for (const [k, x] of Object.entries(rec.p)) {
      const a = T[k] || (T[k] = { key: k, name: x.n, games: 0, wolf: 0, vill: 0, seer: 0, guard: 0, witch: 0, hunter: 0, chief: 0, win: 0, loss: 0 });
      a.name = x.n; a.games++; if (a[x.r] != null) a[x.r]++;
      if ((x.s || (x.r === 'wolf' ? 'wolf' : 'vill')) === rec.w) a.win++; else a.loss++;   // bản ghi cũ chưa có phe (s): Sói là phe Sói, còn lại là phe Dân
    }
  }
  return Object.values(T).sort((a, b) => b.win - a.win || b.games - a.games || String(a.name).localeCompare(String(b.name)));
}
export function winnerOf(players, roles, deadId, ctx = {}) {   // deadId: một người hoặc một mảng người vừa chết (chưa kịp ghi alive=false); ctx: { turned, couple: [a, b] } của vai thêm
  const gone = Array.isArray(deadId) ? deadId : [deadId], turned = ctx.turned || {};
  const alive = Object.keys(players).filter(id => players[id].alive && !gone.includes(id));
  const pack = id => isWolfRole(roles[id]) || !!turned[id];
  const c = ctx.couple, lov = c && pack(c[0]) !== pack(c[1]) && c.every(id => alive.includes(id)) ? c : [];   // cặp đôi khác phe: phe thứ ba
  const rest = alive.filter(id => !lov.includes(id));
  const W = rest.filter(id => roles[id] === 'whitewolf').length, wolves = rest.filter(id => pack(id) && roles[id] !== 'whitewolf').length, others = rest.length - W - wolves;
  if (lov.length && alive.length === 2) return 'Cặp đôi thắng! Hai người yêu nhau sống sót đến cuối cùng.';
  if (W && alive.length === 1) return 'Sói trắng thắng! Một mình sống sót đến cuối cùng.';
  if (!lov.length && !W) {
    if (wolves === 0) return 'Dân làng thắng! Đã diệt hết Sói.';
    if (wolves >= others) return 'Sói thắng! Số Sói đã bằng hoặc hơn dân.';
  }
  return null;
}
const ctxOf = (room, over = {}) => ({ turned: over.turned || room.turned || {}, couple: over.couple || coupleOf(room) });
// Người yêu chết theo: trả về danh sách chết đầy đủ và những người chết theo
function withCouple(room, deaths, couple) {
  const c = couple || coupleOf(room), out = [...deaths], chain = [];
  if (c) for (const [a, b] of [[c[0], c[1]], [c[1], c[0]]]) if (out.includes(a) && !out.includes(b) && room.players[b] && room.players[b].alive) { out.push(b); chain.push(b); }
  return { deaths: out, chain };
}
const aliveIds = room => Object.keys(room.players || {}).filter(id => room.players[id].alive);

/* ---------- Kế hoạch bước tiếp theo của một phòng ----------
   Trả về { u } với u là các khóa cập nhật tương đối so với rooms/<mã>/, hoặc null nếu chưa cần làm gì.
   Mọi giá trị là tuyệt đối (không tăng dần), nên chạy lặp hai lần vẫn ra cùng kết quả. */
// Lần cuối người này còn sống. Bot ghi lại GIỜ CỦA BOT lúc nó thấy nhịp tim đổi giá trị (room.seenAt) nên đồng hồ điện thoại lệch bao nhiêu cũng không sao;
// nơi nào không có seenAt (máy chủ phòng tự chạy luật) thì dùng giờ ghi trong nhịp tim như cũ.
const lastAlive = (room, id) => (room.seenAt && room.seenAt[id]) || (room.seen || {})[id] || (room.players[id] || {}).t || 0;
// Nhịp tim bot được ghi lùi về TƯƠNG LAI chừng này: máy cũ (chưa tải lại trang) có đồng hồ nhanh hơn thật dưới ~1,5 phút vẫn thấy bot "đang sống",
// nên không tự chạy luật rồi xóa nhầm người chơi. Máy mới trừ lại hằng số này nên vẫn nhận ra bot chết sau 20 giây.
export const BEAT_AHEAD = 90000;
export const LOBBY_IDLE_MS = 10000;   // phòng chờ: 10 giây không có nhịp tim thì coi là đã thoát (máy gửi nhịp mỗi 3 giây; bị xóa nhầm thì tự vào lại)
// Giữa ván (đêm/ngày/bỏ phiếu) không ai bị xóa khỏi danh sách người chơi (thoát giữa ván chỉ là offline). Nếu danh sách bị mất người
// (máy khách lỗi/ngủ rồi ghi đè bằng dữ liệu cũ...) thì khôi phục từ bản sao `roster` ghi lúc bắt đầu ván.
export function restorePlan(room) {
  if (!room || !room.roster || !room.roles || !['night', 'day', 'vote', 'hunter'].includes(room.phase)) return null;
  const pl = room.players || {}, dead = room.dead || {}, u = {};
  for (const id of Object.keys(room.roles)) {
    const r = room.roster[id]; if (!r || pl[id]) continue;
    u['players/' + id] = { name: r.name, alive: !dead[id], t: r.t || 0, ...(r.bot ? { bot: true, ready: true } : {}) };
  }
  return Object.keys(u).length ? { u } : null;
}
const lastSpecAlive = (room, id) => (room.seenAt && room.seenAt[id]) || (room.seen || {})[id] || ((room.spectators || {})[id] || {}).t || 0;
export const SPEC_IDLE_MS = 10 * 60 * 1000;   // khán giả im (không còn nhịp tim) quá chừng này thì bị dọn khỏi danh sách
export function planStep(room, now) {
  if (!room) return null;
  const rs = restorePlan(room); if (rs) return rs;
  const staleSp = Object.keys(room.spectators || {}).filter(id => now - lastSpecAlive(room, id) > SPEC_IDLE_MS);
  if (staleSp.length) { const u = {}; staleSp.forEach(id => { u['spectators/' + id] = null; u['seen/' + id] = null; }); return { u }; }
  if (!room.players) return null;

  // 1) Lệnh do người chơi gửi (bắt đầu / ván mới)
  if (room.cmd) {
    const c = room.cmd, ids = Object.keys(room.players);
    if (c.type === 'start' && room.phase === 'lobby' && ids.length >= MIN && ids.length <= MAX && (c.by === room.host || !room.players[room.host])) return startBlock(room) ? { u: { cmd: null } } : startPlan(room, ids, now);   // vai thêm chưa đủ điều kiện: không bắt đầu
    if (c.type === 'again' && room.phase === 'end') return room.endedAt && now - room.endedAt < AGAIN_LOCK * 1000 ? { u: { cmd: null } } : againPlan(room);
    if (c.type === 'kick') {   // chủ phòng mời người chơi chưa sẵn sàng ra khỏi phòng chờ
      const t = room.players[c.target], u = { cmd: null };
      if (room.phase === 'lobby' && c.by === room.host && c.target !== room.host && t && !t.bot && !t.ready) {
        u['players/' + c.target] = null; u['seen/' + c.target] = null; u['ready/' + c.target] = null; u['kicked/' + c.target] = { name: t.name, t: now };
      }
      return { u };
    }
    if ((c.type === 'spec' || c.type === 'play') && (room.phase === 'lobby' || room.phase === 'end')) return { u: switchPlan(room, c, now) };   // xuống khán đài / lên chơi: xử lý tại đây để không bị đua với lúc bắt đầu ván
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
    if (ids.length >= MIN && ids.length <= MAX && ids.every(id => room.players[id].ready) && !startBlock(room)) return startPlan(room, ids, now);
    const at = lobbyFillAt(room);
    if (at && now >= at) {   // chờ đủ lâu mà vẫn thiếu người: thêm người máy cho đủ MIN rồi bắt đầu
      const used = ids.map(id => room.players[id].name), add = [];
      for (let i = 0; ids.length + add.length < MIN; i++) {
        const nm = '🤖 ' + (BOT_NAMES.find(x => !used.includes('🤖 ' + x)) || 'Bot' + i); used.push(nm);
        let id = 'bot_auto' + i; while (room.players[id]) id += 'x';
        add.push([id, nm]);
      }
      const plan = startPlan(room, ids.concat(add.map(a => a[0])), now);
      add.forEach(([id, nm]) => { delete plan.u['players/' + id + '/alive']; delete plan.u['players/' + id + '/ready']; plan.u['players/' + id] = { name: nm, alive: true, t: now, bot: true }; plan.u['roster/' + id] = { name: nm, t: now, bot: true }; });
      return plan;
    }
    return null;
  }

  const expired = room.deadline && now >= room.deadline;
  if (room.hunter) return room.hunterShot || expired ? hunterPlan(room, now) : null;   // đang chờ Thợ săn bắn (phase lưu là 'vote'), không xét phiếu
  if (room.tie && room.phase === 'vote') return room.tieShot || expired ? votePlan(room, now) : null;   // hòa phiếu: đang chờ Trưởng làng chọn người treo cổ (phase vẫn là 'vote'), không xét lại phiếu
  if (room.phase === 'night') {
    const roles = room.roles || {}, n = room.night || {}, wv = n.wolf || {}, al = aliveIds(room);
    const wolves = al.filter(id => inPack(room, id)), wv2 = n.wolf2 || {}, two = needTwo(room);
    const seer = al.find(id => roles[id] === 'seer'), guard = al.find(id => roles[id] === 'guard'), witch = al.find(id => roles[id] === 'witch');
    const cupid = room.round === 1 && al.find(id => roles[id] === 'cupid'), ww = wwAllowed(room) && al.find(id => roles[id] === 'whitewolf');
    const wolvesDone = wolves.length > 0 && wolves.every(id => wv[id] && (!two || wv2[id]));
    const loveWait = n.cupidAt && now < n.cupidAt + LOVE_CHAT * 1000;   // Cupid vừa ghép: cho cặp đôi vài giây nói chuyện riêng rồi mới sang sáng
    const all = wolvesDone && (!seer || n.seer) && (!guard || n.guard) && (!witch || n.witch) && (!cupid || n.cupid) && (!ww || n.ww) && !loveWait;
    if (expired) return nightPlan(room, now);
    if (n.cupid && !n.cupidAt) return { u: { 'night/cupidAt': now, deadline: Math.max(room.deadline || 0, now + LOVE_CHAT * 1000) } };
    if (all) return nightPlan(room, now);
    if (wolvesDone && !n.target) {
      const u = { 'night/target': pickTarget(room) || 'none' }, used = room.witchUsed || {};
      if (two) u['night/target2'] = pickTarget2(room, u['night/target']) || 'none';
      if (witch && !n.witch && (!used.heal || !used.poison) && room.deadline) u.deadline = Math.max(room.deadline, now) + WITCH_EXTRA * 1000;   // Sói chốt xong: cộng thêm thời gian cho Phù thủy cân nhắc thuốc (chỉ khi còn thuốc)
      return { u };
    }   // Sói chọn xong: chốt mục tiêu để Phù thủy biết mà quyết định
  } else if (room.phase === 'day') {
    const al = aliveIds(room), rd = room.ready || {};
    if ((al.length && al.every(id => rd[id])) || expired) {
      if (room.round === 0) return { u: { phase: 'night', round: 1, night: null, votes: null, ready: null, deadline: now + durOf(room, 'night') * 1000, announce: 'Đêm 1 bắt đầu. Cả làng đi ngủ…' } };   // buổi sáng mở đầu: không bỏ phiếu, hết giờ là sang đêm 1
      return { u: { phase: 'vote', votes: null, ready: null, deadline: now + DUR.vote * 1000, announce: 'Mọi người bỏ phiếu chọn người bị treo cổ.' } };
    }
  } else if (room.phase === 'vote') {
    const al = aliveIds(room), v = room.votes || {};
    if ((al.length && al.every(id => v[id])) || expired) return votePlan(room, now);
  }
  return null;
}

function switchPlan(room, c, now) {
  const u = { cmd: null }, by = c.by, pl = room.players || {}, sp = room.spectators || {};
  if (c.type === 'spec') {
    const p = pl[by], rest = Object.keys(pl).filter(id => id !== by && !pl[id].bot).sort((a, b) => (pl[a].t || 0) - (pl[b].t || 0));
    if (!p || p.bot || !rest.length || room.allowSpec === false) return u;   // người thật cuối cùng không xuống được; Khán đài tắt thì không xuống
    u['players/' + by] = null; u['seen/' + by] = null; u['ready/' + by] = null; u['spectators/' + by] = { name: p.name, t: now };
    if (room.host === by) u.host = rest[0];
  } else {
    const s = sp[by];
    if (!s || pl[by] || Object.keys(pl).length >= capOf(room) || Object.values(pl).some(x => String(x.name).trim().toLowerCase() === String(s.name).trim().toLowerCase())) return u;
    u['spectators/' + by] = null; u['players/' + by] = { name: s.name, alive: true, t: now }; u['seen/' + by] = now;
  }
  return u;
}
function startPlan(room, ids, now) {
  const picks = extraPicks(room), rp = rolePlan(ids.length, picks), roles = assignRoles(ids, picks), dropped = Object.values(rp.bad), u = { cmd: null, phase: 'day', round: 0, night: null, votes: null, ready: null, botMem: null, lastGuard: null, seerLog: null, winner: null, log: null, endedAt: null, chat: null, deadline: now + durOf(room, 'day') * 1000, announce: 'Ván bắt đầu! Buổi sáng mở đầu: mọi người làm quen và trò chuyện với nhau. Hết giờ thì trời tối, Đêm 1 bắt đầu.' + (dropped.length ? '\n⚠️ Bỏ vai không đủ điều kiện: ' + dropped.join(' ') : '') };   // mở đầu bằng một buổi sáng nói chuyện (không bỏ phiếu) rồi mới sang đêm 1
  u.dead = null; u.witchUsed = null; u.hunter = null; u.hunterShot = null; u.last = null; u.couple = null; u.turned = null; u.knightMark = null; u.knightLast = null; u.dbl = null; u.tie = null; u.tieShot = null;
  ids.forEach(id => { u['roles/' + id] = roles[id]; u['players/' + id + '/alive'] = true; u['players/' + id + '/ready'] = null; const pl = room.players[id]; if (pl) u['roster/' + id] = { name: pl.name, t: pl.t || 0, ...(pl.bot ? { bot: true } : {}) }; });
  return { u };
}
function againPlan(room) {
  const u = { cmd: null, phase: 'lobby', round: 0, roles: null, night: null, votes: null, ready: null, botMem: null, lastGuard: null, seerLog: null, winner: null, log: null, endedAt: null, roster: null, dead: null, witchUsed: null, couple: null, turned: null, knightMark: null, knightLast: null, dbl: null, tie: null, tieShot: null, hunter: null, hunterShot: null, chat: null, announce: null, deadline: null };
  Object.entries(room.players || {}).forEach(([id, p]) => { u['players/' + id + '/alive'] = true; u['players/' + id + '/ready'] = p.bot ? true : null; });   // bot luôn sẵn sàng
  // giữ lại kết quả ván vừa rồi (người thắng, diễn biến, vai từng người) để phòng chờ vẫn hiện cho đến khi ván mới bắt đầu
  if (room.winner) u.last = { winner: room.winner, round: room.round || 0, t: room.endedAt || 0, log: room.log || {}, p: Object.entries(room.players || {}).sort((a, b) => (a[1].t || 0) - (b[1].t || 0)).map(([id, p]) => ({ n: p.name, r: (room.roles || {})[id] || null, a: !!p.alive, ...(p.bot ? { bot: true } : {}) })) };
  return { u };
}
const lk = (r, slot) => String(r).padStart(2, '0') + slot;   // khóa nhật ký diễn biến: <vòng 2 số><phần>: 1 = đêm, 2 = Thợ săn sau đêm, 3 = ngày (bỏ phiếu), 4 = Thợ săn sau bỏ phiếu
function pickTarget(room) {   // mục tiêu của Sói: số phiếu cao nhất (hòa thì bốc ngẫu nhiên), chỉ tính Sói còn sống nhắm vào người còn sống
  const players = room.players, n = room.night || {}, al = aliveIds(room), wv = {};
  Object.entries(n.wolf || {}).forEach(([id, t]) => { if (al.includes(id) && inPack(room, id) && players[t] && players[t].alive) wv[id] = t; });
  const t = tally(wv); return t.top.length && t.max > 0 ? t.top[Math.floor(Math.random() * t.top.length)] : null;
}
export const needTwo = room => room.phase === 'night' && room.dbl === room.round && aliveIds(room).filter(id => !inPack(room, id)).length >= 2;   // đêm Sói con vừa chết: bầy Sói cắn 2 người
function pickTarget2(room, first) {   // mục tiêu thứ hai (đêm cắn đôi): phiếu thứ hai của các Sói, khác mục tiêu thứ nhất
  const players = room.players, n = room.night || {}, al = aliveIds(room), wv = {};
  Object.entries(n.wolf2 || {}).forEach(([id, t]) => { if (al.includes(id) && inPack(room, id) && t !== first && players[t] && players[t].alive) wv[id] = t; });
  const t = tally(wv); return t.top.length && t.max > 0 ? t.top[Math.floor(Math.random() * t.top.length)] : null;
}
function nightPlan(room, now) {
  const players = room.players, roles = room.roles || {}, r = room.round, n = room.night || {}, al = aliveIds(room), nm = id => players[id].name;
  const live = id => !!(id && id !== 'none' && players[id] && players[id].alive);
  const turned = { ...(room.turned || {}) }, inP = id => isWolfRole(roles[id]) || !!turned[id];
  const t1 = n.target ? (live(n.target) ? n.target : null) : pickTarget(room);
  const two = room.dbl === r && al.filter(id => !inP(id)).length >= 2;   // đêm cắn đôi (Sói con vừa chết)
  const t2 = !two ? null : n.target2 ? (live(n.target2) && n.target2 !== t1 ? n.target2 : null) : pickTarget2(room, t1);
  const victims = [t1, t2].filter(Boolean);
  const guardAlive = al.some(id => roles[id] === 'guard');
  const guardPick = guardAlive && live(n.guard) && n.guard !== room.lastGuard ? n.guard : null;   // Bảo vệ không được bảo vệ cùng một người hai đêm liên tiếp (chọn trùng thì coi như không bảo vệ ai)
  const witchId = al.find(id => roles[id] === 'witch'), wd = n.witch || {}, used = room.witchUsed || {};
  const healTo = wd.save === true ? t1 : (typeof wd.save === 'string' && victims.includes(wd.save) ? wd.save : null);   // save: true = cứu người bị cắn đầu tiên; hoặc mã người được cứu (đêm cắn đôi)
  const healOk = !!(witchId && healTo && !used.heal);   // thuốc cứu: dùng một lần cả ván
  const poisonT = witchId && wd.poison && !used.poison && live(wd.poison) ? wd.poison : null;   // thuốc độc: một lần, Bảo vệ không cản được
  const u = { night: null, votes: null, ready: null, lastGuard: guardPick };   // nhớ người được bảo vệ đêm này để đêm sau không chọn lại
  const seerId = al.find(id => roles[id] === 'seer');
  // Tiên tri chỉ giữ kết quả đêm vừa soi (ghi đè kết quả cũ), không lưu lịch sử để khỏi bị copy dán vào chat
  u.seerLog = seerId && n.seer && players[n.seer] ? { [r]: `Đêm ${r}: ${players[n.seer].name} ${inPack(room, n.seer) ? 'LÀ SÓI' : 'không phải Sói'}.` } : null;
  if (healOk) u['witchUsed/heal'] = true;
  if (poisonT) u['witchUsed/poison'] = true;
  // Cupid (đêm 1): ghép cặp đôi
  let couple = coupleOf(room);
  if (r === 1 && !couple && al.some(id => roles[id] === 'cupid') && n.cupid && live(n.cupid.a) && live(n.cupid.b) && n.cupid.a !== n.cupid.b) { couple = [n.cupid.a, n.cupid.b]; u.couple = { a: couple[0], b: couple[1] }; }
  // từng người bị Sói cắn: cứu được, hóa Sói (Nửa người nửa sói), hay chết
  const bitDead = [], texts = [], savedBy = {};
  victims.forEach((v, i) => {
    const g = guardPick === v, h = healOk && healTo === v;
    let t;
    if (g || h) { savedBy[v] = g && h ? 'Bảo vệ và Phù thủy' : h ? 'Phù thủy' : 'Bảo vệ'; t = `Có người bị Sói cắn nhưng được ${savedBy[v]} cứu`; }
    else if (roles[v] === 'halfwolf' && !turned[v]) { turned[v] = true; u['turned/' + v] = room.round;   /* lưu số đêm bị hóa Sói (luôn > 0, các chỗ khác chỉ xét có/không); giao diện dùng để biết thẻ báo còn mới */ t = 'Có người bị Sói cắn nhưng không chết'; }   // Nửa người nửa sói bị cắn: hóa Sói, không chết
    else { bitDead.push(v); t = `${nm(v)} bị Sói cắn chết`; }
    texts.push(i ? t.replace(/^Có/, 'có') : t);
  });
  const wolfTxt = !victims.length ? 'Sói không cắn ai' : texts.join(', ');
  const deaths = [...bitDead]; if (poisonT && !deaths.includes(poisonT)) deaths.push(poisonT);
  const extra = [];   // câu thêm của vai thêm
  // Hiệp sĩ bị Sói cắn chết: một Sói trong bầy trúng kiếm độc, sẽ chết sau 1 đêm (từ 12 người: 2 đêm)
  const kn = bitDead.find(id => roles[id] === 'knight');
  if (kn) {
    const ws = [...Object.entries(n.wolf || {}), ...Object.entries(n.wolf2 || {})].filter(([id, t]) => t === kn && al.includes(id) && inP(id)).map(([id]) => id);
    const cands = [...new Set(ws.length ? ws : al.filter(id => inP(id) && !deaths.includes(id)))].sort();
    const delay = KNIGHT_DELAY;
    if (cands.length) { u.knightMark = { id: hpick(cands, 'knight' + kn + r), at: r + delay }; extra.push(`Hiệp sĩ ${nm(kn)} trúng kế cuối: một con Sói trong bầy đã trúng kiếm độc và sẽ chết vào đêm ${r + delay}`); }
  }
  const km = room.knightMark;
  if (km && km.at <= r) { if (live(km.id) && !deaths.includes(km.id)) { deaths.push(km.id); extra.push(`${nm(km.id)} chết vì trúng kiếm độc của Hiệp sĩ`); u.knightLast = { id: km.id, r }; } u.knightMark = null; }   // knightLast: để báo riêng cho bầy Sói biết vì sao Sói đó chết (cả khi chế độ căng)
  // Sói trắng cắn trộm một Sói
  const wwId = wwAllowed(room) ? al.find(id => roles[id] === 'whitewolf') : null;
  if (wwId && live(n.ww) && n.ww !== wwId && inP(n.ww)) {
    if (guardPick === n.ww) { /* Bảo vệ đúng người nên cứu được */ }
    else if (!deaths.includes(n.ww)) { deaths.push(n.ww); extra.push(`${nm(n.ww)} bị Sói trắng cắn chết`); }
  }
  // người yêu chết theo
  const wc = withCouple(room, deaths, couple); const chain = wc.chain; wc.deaths.forEach(d => { if (!deaths.includes(d)) deaths.push(d); });
  chain.forEach(d => extra.push(`${nm(d)} chết theo vì tình yêu`));
  const wolfDied = bitDead.length > 0;
  let note = wolfTxt + (poisonT ? (wolfDied ? ` và ${nm(poisonT)} bị đầu độc chết` : `, còn ${nm(poisonT)} bị đầu độc chết`) : (!wolfDied && !extra.length ? ' nên không ai chết' : ''));
  note = [note, ...extra].join('. ') + '.';
  let announce = 'Đêm qua ' + note.replace(/^Có/, 'có');
  if (room.hideRoles) {   // chế độ căng: không lộ lý do (Sói không cắn / Bảo vệ cứu / Phù thủy cứu / đầu độc), chỉ báo ai chết hoặc đêm an toàn
    // Sói không cắn ai và không ai chết: nói rõ "Sói không cắn ai". Có người chết (kể cả bị đầu độc) thì chỉ báo tên, không nói gì thêm để khỏi lộ Phù thủy
    const quiet = !victims.length ? 'Sói không cắn ai, không ai chết.' : 'An toàn, không ai chết.';
    note = deaths.length ? `${deaths.map(nm).join(' và ')} đã chết.` : quiet;
    announce = deaths.length ? `Đêm qua ${note}` : (!victims.length ? 'Đêm qua Sói không cắn ai, không ai chết.' : 'Đêm qua an toàn, không ai chết.');
  }
  deaths.forEach(d => { u['players/' + d + '/alive'] = false; u['dead/' + d] = true; });
  if (deaths.some(id => roles[id] === 'pup')) u.dbl = r + 1;   // Sói con chết: đêm sau bầy Sói cắn 2 người
  u['log/' + lk(r, 1)] = note; u.announce = announce;
  const hunterId = deaths.find(id => roles[id] === 'hunter' && id !== poisonT);   // Thợ săn bị đầu độc thì không bắn được
  if (hunterId) {   // chờ Thợ săn chọn người bắn rồi mới xét thắng thua và sang ngày
    u.phase = 'vote'; u.hunter = { id: hunterId, src: 'night' };   // phase lưu là 'vote' để trang cũ (chưa biết bước Thợ săn) không bị lỗi; trang mới nhận ra bước này nhờ room.hunter
    u.votes = null; u.hunterShot = null; u.deadline = now + DUR.hunter * 1000;
    u.announce = announce + `\nThợ săn ${nm(hunterId)} bị loại và được bắn một người trước khi gục.`;
    return { u, g: null };
  }
  const ctx = { turned, couple };
  const win = winnerOf(players, roles, deaths, ctx);
  if (win) { u.phase = 'end'; u.winner = win; u.deadline = null; u.endedAt = now; u['log/999'] = '🏁 ' + win; } else { u.phase = 'day'; u.deadline = now + durOf(room, 'day') * 1000; }
  return { u, g: win ? gameRecord({ ...room, turned, couple: couple ? { a: couple[0], b: couple[1] } : null }, win, now) : null };
}
function votePlan(room, now) {
  const players = room.players, roles = room.roles || {}, r = room.round, al = aliveIds(room);
  const v = {}; Object.entries(room.votes || {}).forEach(([id, t]) => { if (al.includes(id) && players[t] && players[t].alive) v[id] = t; });
  const t = tally(v, id => roles[id] === 'chief' ? 2 : 1), u = { night: null, votes: null, ready: null };   // phiếu của Trưởng làng tính là 2
  let dead = null, announce, note;
  if (room.tie) {   // bước Trưởng làng phá hòa: chốt theo người Trưởng làng chọn (không chọn kịp thì không ai bị treo)
    const ids = Object.values(room.tie.ids || {}).filter(id => players[id] && players[id].alive), pk = ids.includes(room.tieShot) ? room.tieShot : null;
    u.tie = null; u.tieShot = null;
    if (pk) { dead = pk; announce = `Hòa phiếu, Trưởng làng chọn treo cổ ${players[dead].name}${room.hideRoles ? '.' : ` (${ROLE_NAME[roles[dead]]}).`}`; }
    else announce = 'Hòa phiếu và Trưởng làng không quyết kịp, mọi người hòa phiếu đều sống, hôm nay không ai bị treo cổ.';
  } else if (t.top.length > 1 && t.max > 0 && (al.some(id => roles[id] === 'chief') || (room.hideRoles && Object.values(roles).includes('chief')))) {   // hòa phiếu: Trưởng làng (còn sống) chọn một trong những người hòa; chế độ căng thì luôn chờ đủ giờ để không lộ Trưởng làng còn sống hay không
    const cid = al.find(id => roles[id] === 'chief') || null;
    return { u: { tie: { ids: t.top, chief: cid }, tieShot: null, deadline: now + DUR.tie * 1000, announce: `Hòa phiếu giữa ${t.top.map(id => players[id].name).join(' và ')}. Trưởng làng đang suy nghĩ để quyết định treo ai (${DUR.tie} giây, không quyết kịp thì mọi người hòa phiếu đều sống).` }, g: null };
  } else if (t.top.length === 1 && t.max > 0) { dead = t.top[0]; announce = `Làng treo cổ ${players[dead].name}${room.hideRoles ? '.' : ` (${ROLE_NAME[roles[dead]]}).`}`;   /* hideRoles: chế độ không lộ vai khi chết */ }
  else announce = 'Phiếu hòa hoặc không ai bỏ phiếu, hôm nay không ai bị treo cổ.';
  const wc = withCouple(room, dead ? [dead] : []), deaths = wc.deaths;   // người yêu của người bị treo chết theo
  deaths.forEach(d => { u['players/' + d + '/alive'] = false; u['dead/' + d] = true; });
  if (wc.chain.length) announce += ' ' + wc.chain.map(id => players[id].name).join(' và ') + ' chết theo vì tình yêu.';
  if (deaths.some(id => roles[id] === 'pup')) u.dbl = r + 1;   // Sói con chết: đêm sau bầy Sói cắn 2 người
  note = dead ? announce : room.tie ? announce : 'Hòa phiếu, không ai bị treo cổ.';
  // công khai ai bỏ phiếu cho ai (số trong ngoặc là số phiếu, Trưởng làng tính 2)
  const nm = id => players[id].name, by = {};
  Object.entries(v).forEach(([voter, tg]) => (by[tg] = by[tg] || []).push(voter));
  const tot = vs => vs.reduce((n, id) => n + (roles[id] === 'chief' ? 2 : 1), 0);
  // luật gốc: "(5 phiếu)" hoặc, khi có Trưởng làng bầu, "(5 người, 6 phiếu)". Chế độ căng: chỉ ghi số người, không để lộ ai là Trưởng làng
  const cnt = vs => room.hideRoles ? `${vs.length} người` : tot(vs) === vs.length ? `${vs.length} phiếu` : `${vs.length} người, ${tot(vs)} phiếu`;
  const parts = Object.entries(by).sort((a, b) => tot(b[1]) - tot(a[1])).map(([tg, vs]) => `${nm(tg)} ← ${vs.map(nm).join(', ')} (${cnt(vs)})`);
  const abst = al.filter(id => !v[id]).map(nm);
  const detail = '🗳️ Phiếu bầu:\n' + (parts.length ? parts.join('\n') : 'Không ai bỏ phiếu') + (abst.length && parts.length ? `\nKhông bỏ phiếu: ${abst.join(', ')}` : '');
  announce += '\n' + detail; note += '\n' + detail;
  u['log/' + lk(r, 3)] = note;
  const hid = deaths.find(id => roles[id] === 'hunter');
  if (hid) {   // Thợ săn bị treo cổ (hoặc chết theo người yêu): được bắn một người trước khi gục
    u.phase = 'vote'; u.hunter = { id: hid, src: 'vote' };   // xem chú thích ở trên
    u.votes = null; u.hunterShot = null; u.deadline = now + DUR.hunter * 1000;
    u.announce = announce + `\nThợ săn ${players[hid].name} được bắn một người trước khi gục.`;
    return { u, g: null };
  }
  const win = winnerOf(players, roles, deaths, ctxOf(room));
  if (win) { u.phase = 'end'; u.winner = win; u.announce = announce; u.deadline = null; u.endedAt = now; u['log/999'] = '🏁 ' + win; }
  else { u.phase = 'night'; u.round = r + 1; u.announce = announce + `\nĐêm ${r + 1} bắt đầu…`; u.deadline = now + durOf(room, 'night') * 1000; }
  return { u, g: win ? gameRecord(room, win, now) : null };
}
function hunterPlan(room, now) {   // Thợ săn đã chọn người bắn (hoặc hết giờ): bắn xong mới xét thắng thua rồi sang bước kế tiếp
  const players = room.players, roles = room.roles || {}, h = room.hunter || {}, r = room.round;
  const pick = room.hunterShot && players[room.hunterShot] && players[room.hunterShot].alive && room.hunterShot !== h.id ? room.hunterShot : null;
  const hn = players[h.id] ? players[h.id].name : 'Thợ săn', u = { hunter: null, hunterShot: null, votes: null, ready: null };
  let note;
  const wc = withCouple(room, pick ? [pick] : []), deaths = wc.deaths;
  deaths.forEach(d => { u['players/' + d + '/alive'] = false; u['dead/' + d] = true; });
  if (pick) { note = `Thợ săn ${hn} bắn ${players[pick].name} chết${room.hideRoles ? '' : ` (${ROLE_NAME[roles[pick]]})`}.`; }
  else note = `Thợ săn ${hn} không bắn ai.`;
  if (wc.chain.length) note += ' ' + wc.chain.map(id => players[id].name).join(' và ') + ' chết theo vì tình yêu.';
  if (deaths.some(id => roles[id] === 'pup')) u.dbl = r + 1;   // Sói con chết: đêm sau bầy Sói cắn 2 người
  u['log/' + lk(r, h.src === 'night' ? 2 : 4)] = note;
  const win = winnerOf(players, roles, deaths, ctxOf(room));
  if (win) { u.phase = 'end'; u.winner = win; u.announce = note; u.deadline = null; u.endedAt = now; u['log/999'] = '🏁 ' + win; }
  else if (h.src === 'night') { u.phase = 'day'; u.announce = note; u.deadline = now + durOf(room, 'day') * 1000; }
  else { u.phase = 'night'; u.round = r + 1; u.announce = note + `\nĐêm ${r + 1} bắt đầu…`; u.deadline = now + durOf(room, 'night') * 1000; }
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
  if (room.tie) {   // Trưởng làng máy chọn người treo cổ trong số người hòa phiếu (Sói thì tránh đồng bọn)
    const tt = room.tie, cp = tt.chief && room.players[tt.chief], elt = now - (room.deadline - DUR.tie * 1000);
    if (cp && cp.bot && !room.tieShot && elt >= 1500 + hash(tt.chief + 't' + r) * 4000) {
      let c = Object.values(tt.ids || {}).filter(id => room.players[id] && room.players[id].alive);
      if (inPack(room, tt.chief) && c.some(id => !inPack(room, id))) c = c.filter(id => !inPack(room, id));
      if (c.length) return { u: { tieShot: hpick(c, tt.chief + 'ts' + r) } };
    }
    return null;
  }
  if (room.hunter) {   // Thợ săn máy (đã chết) chọn người bắn sau một lúc
    const h = room.hunter || {}, hp = room.players[h.id], elh = now - (room.deadline - DUR.hunter * 1000);
    if (hp && hp.bot && !room.hunterShot && elh >= 2000 + hash(h.id + 'h' + r) * 8000) { const c = al.filter(id => id !== h.id); if (c.length) return { u: { hunterShot: hpick(c, h.id + 'hs' + r) } }; }
    return null;
  }
  const bots = al.filter(id => room.players[id].bot); if (!bots.length) return null;
  const el = now - (room.deadline - durOf(room, ph) * 1000), mem = room.botMem || {}, u = {};
  if (ph === 'night') {
    const n = room.night || {};
    for (const b of bots) {
      if (el < 2000 + hash(b + 'n' + r) * 10000) continue;
      if (inPack(room, b)) {   // bầy Sói (Sói, Sói con, Sói trắng, Nửa người nửa sói đã hóa Sói)
        const c = al.filter(id => !inPack(room, id));
        if (c.length && !(n.wolf || {})[b]) u['night/wolf/' + b] = hpick(c, 'wolf' + r);   // Sói máy cùng chọn một mục tiêu
        else if (c.length > 1 && needTwo(room) && (n.wolf || {})[b] && !(n.wolf2 || {})[b]) {   // đêm cắn đôi: chọn người thứ hai
          const first = hpick(c, 'wolf' + r), c2 = c.filter(id => id !== first); u['night/wolf2/' + b] = hpick(c2, 'wolf2' + r);
        }
        if (roles[b] === 'whitewolf' && wwAllowed(room) && !n.ww) {   // Sói trắng máy: thỉnh thoảng cắn trộm một Sói
          const w = al.filter(id => inPack(room, id) && roles[id] !== 'whitewolf'); u['night/ww'] = w.length && hash(b + 'ww' + r) < 0.6 ? hpick(w, b + 'wwt' + r) : 'none';
        }
      } else if (roles[b] === 'cupid' && r === 1 && !n.cupid) {   // Cupid máy: ghép hai người bất kỳ
        const a = hpick(al, b + 'cu1'), c = al.filter(id => id !== a), d = c.length ? hpick(c, b + 'cu2') : null; if (a && d) u['night/cupid'] = { a, b: d };
      } else if (roles[b] === 'seer' && !n.seer) {
        const checked = (mem[b] || {}).checked || {}, others = al.filter(id => id !== b), fresh = others.filter(id => !checked[id]);
        const t = hpick(fresh.length ? fresh : others, b + 'seer' + r); if (t) { u['night/seer'] = t; u['botMem/' + b + '/checked/' + t] = inPack(room, t) ? 'wolf' : 'ok'; }
      } else if (roles[b] === 'witch' && !n.witch && n.target) {   // Phù thủy máy: cứu người bị cắn (thường là vậy), không dùng thuốc độc
        const used = room.witchUsed || {}, tg = n.target === 'none' ? null : n.target;
        u['night/witch'] = { save: !!(tg && !used.heal && hash(b + 'ws' + r) < 0.85), poison: null };
      } else if (roles[b] === 'guard' && !n.guard) {
        const last = (mem[b] || {}).last, c = al.filter(id => id !== last && id !== room.lastGuard), t = hpick(c.length ? c : al, b + 'guard' + r);
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
      let c = al.filter(id => id !== b && !(inPack(room, b) && inPack(room, id))); if (!c.length) continue;
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
// Tin nhắn của máy cũ (đồng hồ lệch) có mã/giờ sai nên bị xếp sai chỗ: bot đóng dấu giờ máy chủ `ts` cho mọi tin chưa có, trang xếp theo `ts`.
export function chatStamps(basePath, chat, now) {
  const u = {};
  for (const [id, m] of Object.entries(chat || {})) if (m && typeof m === 'object' && m.ts == null) u[basePath + '/' + id + '/ts'] = now;
  return u;
}
export function runBot(B, { log = console.log, now = () => Date.now(), maxAgeMs = 12 * 3600 * 1000 } = {}) {
  let rooms = {}, caroRooms = {}; const busy = {};
  const track = {};   // track[mã][pid] = { v: giá trị nhịp tim lần trước, at: giờ bot thấy nó đổi }
  const withSeenAt = (code, room) => {
    if (!room || !room.players) return room;
    const t = track[code] || (track[code] = {}), seenAt = {}, nw = now();
    for (const id of [...Object.keys(room.players), ...Object.keys(room.spectators || {})]) {
      const v = (room.seen || {})[id], o = t[id];
      if (!o) t[id] = { v, at: nw }; else if (o.v !== v) { o.v = v; o.at = nw; }
      seenAt[id] = t[id].at;
    }
    for (const id of Object.keys(t)) if (!(id in room.players) && !(id in (room.spectators || {}))) delete t[id];
    return { ...room, seenAt };
  };
  const tick = async () => {
    const stamps = {};
    for (const [code, room] of Object.entries(rooms || {})) if (room && room.chat) Object.assign(stamps, chatStamps('rooms/' + code + '/chat', room.chat, now()));
    for (const [code, room] of Object.entries(caroRooms || {})) if (room && room.chat) Object.assign(stamps, chatStamps('caro/' + code + '/chat', room.chat, now()));
    if (Object.keys(stamps).length) { try { await B.update(stamps); } catch (e) { log('Lỗi đóng dấu giờ tin nhắn', e && e.message); } }
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
  const beat = () => B.set('meta/botBeat', now() + BEAT_AHEAD).catch(() => {});
  beat(); const iv2 = setInterval(beat, 5000);
  return () => { clearInterval(iv); clearInterval(iv2); if (unwatch) unwatch(); if (unwatch2) unwatch2(); };
}
