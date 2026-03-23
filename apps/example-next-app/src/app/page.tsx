import Link from "next/link";
import styles from "./page.module.css";

/**
 * トップページ: ルーム名を入力して参加する。
 * Server Component として動作（フォーム送信で /room/[roomName] へ遷移）。
 */
export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>
          <span className={styles.badge}>use-skyway</span>
          SkyWay React Hooks
        </h1>
        <p className={styles.description}>
          @skyway-sdk/room を Next.js App Router で簡単に使えるカスタムフックライブラリ
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>ルームに参加</h2>
        <form className={styles.form} action="/room" method="get">
          <input
            type="text"
            name="name"
            placeholder="ルーム名を入力"
            required
            minLength={1}
            maxLength={64}
            className={styles.input}
          />
          <select name="mode" defaultValue="compat" className={styles.select}>
            <option value="compat">Compat</option>
            <option value="core">Core</option>
          </select>
          <button type="submit" className={styles.primaryButton}>
            参加する
          </button>
        </form>
      </div>

      <div className={styles.features}>
        <FeatureCard
          icon="🔗"
          title="useRoom"
          description="ルームの参加・退出を管理する中心フック"
        />
        <FeatureCard
          icon="🎥"
          title="useLocalPerson"
          description="カメラ・マイクの発行とメディア制御"
        />
        <FeatureCard
          icon="👥"
          title="useRemotePersons"
          description="リモート参加者の自動サブスクライブ"
        />
        <FeatureCard icon="📡" title="useMediaStream" description="SkyWayStreamFactory ラッパー" />
        <FeatureCard icon="📊" title="useWebRTCStats" description="RTT・パケットロスなどの統計" />
        <FeatureCard icon="⚛️" title="React Compiler" description="自動メモ化による最適化" />
      </div>

      <footer className={styles.footer}>
        <Link href="https://skyway.ntt.com/ja/" target="_blank" rel="noopener noreferrer">
          SkyWay ドキュメント →
        </Link>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.featureCard}>
      <span className={styles.featureIcon}>{icon}</span>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}
