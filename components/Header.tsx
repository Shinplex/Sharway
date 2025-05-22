interface User {
  id: number;
  username: string;
  name: string;
  trust_level: number;
  active: boolean;
  silenced: boolean;
}

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header class="container">
      <nav>
        <ul>
          <li><strong>Sharway</strong></li>
        </ul>
        {user && (
          <ul>
            <li><a href="/create-distribution" role="button">创建新分发</a></li>
            <li><a href="/logout" role="button" class="secondary outline">注销</a></li>
          </ul>
        )}
      </nav>
    </header>
  );
}