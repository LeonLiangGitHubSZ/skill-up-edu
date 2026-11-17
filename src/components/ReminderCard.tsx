import { useEffect, useState } from "react";
import { TOKEN_HELP_URL } from "../data/push";
import { forgetToken, loadToken, pushSupport, saveReminder, saveToken, sendTestReminder, subscribePush } from "../lib/reminder";
import { useStore } from "../store";

const SUPPORT_TEXT = {
  "not-installed": "要先把 Skill Up 加到主屏幕，并从主屏幕的图标打开，才能开启提醒（iOS 16.4 以上）。",
  unsupported: "当前环境不支持网页推送。iPhone 需要 iOS 16.4 以上，并从主屏幕图标打开 Skill Up。",
  "not-configured": "提醒功能还没部署好（缺少推送密钥），等下次更新。",
} as const;

/** 「我的」页：每天固定时间推送学习提醒 */
export function ReminderCard() {
  const { state, update } = useStore();
  const saved = state.settings.reminder;
  const [time, setTime] = useState(saved?.time ?? "20:30");
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [help, setHelp] = useState(false);
  const support = pushSupport();

  useEffect(() => {
    void loadToken().then((t) => setHasToken(!!t));
  }, []);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setMsg("");
    try {
      setMsg(await action());
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function currentToken(): Promise<string> {
    if (token.trim()) {
      await saveToken(token);
      setHasToken(true);
      setToken("");
      return token.trim();
    }
    const t = await loadToken();
    if (!t) throw new Error("先粘贴 GitHub 令牌");
    return t;
  }

  const enable = () =>
    run(async () => {
      const subscription = await subscribePush(); // 必须最先调用：iOS 只允许在点击时申请通知权限
      const t = await currentToken();
      await saveReminder(t, { enabled: true, time, subscription });
      update((d) => { d.settings.reminder = { enabled: true, time }; });
      return `✓ 已开启：每天 ${time} 左右提醒（GitHub 定时任务可能晚几分钟到十几分钟）`;
    });

  const disable = () =>
    run(async () => {
      await saveReminder(await currentToken(), { enabled: false, time });
      update((d) => { d.settings.reminder = { enabled: false, time }; });
      return "已关闭每日提醒";
    });

  const test = () =>
    run(async () => {
      await sendTestReminder(await currentToken());
      return "✓ 已请求发送测试提醒，大约 1 分钟内会收到（GitHub 启动任务需要一点时间）";
    });

  return (
    <div className="card list reminder">
      <div className="card-row">
        <div>
          <b>每日学习提醒</b>
          <div className="muted small">{saved?.enabled ? `已开启 · 每天 ${saved.time} 左右` : "未开启"}</div>
        </div>
        {support === "ok" && <input type="time" className="time-input" value={time} onChange={(e) => setTime(e.target.value)} />}
      </div>
      {support !== "ok" ? (
        <div className="muted small">{SUPPORT_TEXT[support]}</div>
      ) : (
        <>
          {!hasToken ? (
            <>
              <input
                className="fill small-input"
                type="password"
                placeholder="粘贴 GitHub 令牌（github_pat_ 开头）"
                value={token}
                autoComplete="off"
                onChange={(e) => setToken(e.target.value)}
              />
              <button className="link" onClick={() => setHelp(!help)}>{help ? "收起说明" : "令牌怎么创建？"}</button>
              {help && (
                <ol className="small help-list">
                  <li>用个人账号 LeonLiangGitHubSZ 登录 GitHub，打开 <a href={TOKEN_HELP_URL} target="_blank" rel="noreferrer">创建细粒度令牌</a> 页面。</li>
                  <li>Token name 填「Skill Up 提醒」，Expiration 选 90 days。</li>
                  <li>Repository access 选 Only select repositories → skill-up-edu。</li>
                  <li>Permissions → Repository permissions：Actions 和 Variables 都选 Read and write。</li>
                  <li>生成后复制令牌，粘贴到上面。令牌只存在这台手机上，不会进备份。</li>
                </ol>
              )}
            </>
          ) : (
            <div className="muted small">
              已保存 GitHub 令牌（只在本机）·{" "}
              <button className="link" onClick={() => void forgetToken().then(() => setHasToken(false))}>换一个令牌</button>
            </div>
          )}
          <div className="rate-row">
            <button className="btn" disabled={busy} onClick={() => void enable()}>{saved?.enabled ? "保存时间" : "开启提醒"}</button>
            {saved?.enabled && <button className="btn ghost" disabled={busy} onClick={() => void disable()}>关闭</button>}
          </div>
          {saved?.enabled && <button className="btn ghost" disabled={busy} onClick={() => void test()}>发送测试提醒</button>}
          {msg && <div className="small">{msg}</div>}
        </>
      )}
    </div>
  );
}
