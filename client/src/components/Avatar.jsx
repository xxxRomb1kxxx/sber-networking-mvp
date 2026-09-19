export default function Avatar({ user, className = '' }) {
  const initials = (user?.fullName || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
  return (
    <span
      className={`avatar ${className}`}
      style={{ background: user?.avatarColor || '#21A038' }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
