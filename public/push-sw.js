// 学习提醒：由 Service Worker 载入（vite.config.ts 的 workbox.importScripts）。
// GitHub 定时任务推送过来时，按本机的学习摘要（IndexedDB 里的 skillup-reminder）生成通知文字。

function readSummary() {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open("keyval-store");
    } catch {
      resolve(null);
      return;
    }
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      try {
        const get = req.result.transaction("keyval", "readonly").objectStore("keyval").get("skillup-reminder");
        get.onsuccess = () => resolve(get.result ?? null);
        get.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    };
  });
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function composeReminder(s, data, day) {
  if (data && data.test) return { title: "Skill Up 测试提醒", body: "收到这条，说明每日学习提醒已经设置成功 🎉" };
  if (!s) return { title: "该学习啦 📚", body: "打开 Skill Up 学一课，离考试又近一步。" };
  const exam = s.next ? `距${s.next.name}考试还有 ${s.next.daysLeft} 天。` : "";
  const review = s.due > 0 ? `另有 ${s.due} 道题到了复习时间。` : "";
  if (s.day === day) {
    const left = Math.max(0, s.goal - s.done);
    if (left === 0) return { title: "今天的目标完成了 🎉", body: s.due > 0 ? `还有 ${s.due} 道题到了复习时间，顺手复习一下？` : `保持节奏，明天继续！${exam}` };
    return { title: `今天还差 ${left} 课`, body: `${s.streak > 0 ? `连胜 ${s.streak} 天，别断！` : ""}${review}${exam}` };
  }
  return { title: "今天还没学习 📚", body: `${s.streak > 0 ? `连胜 ${s.streak} 天，别断！` : ""}今天的目标是 ${s.goal} 课。${exam}` };
}

// 供测试在 Service Worker 里直接调用
self.__skillupComposeReminder = composeReminder;
self.__skillupReadSummary = readSummary;

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    readSummary().then((s) => {
      const { title, body } = composeReminder(s, data, today());
      return self.registration.showNotification(title, {
        body,
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
        tag: "study-reminder",
        data: { url: self.registration.scope },
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
