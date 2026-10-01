export default function Avatar({ user, className = '' }) {
  const initials = (user?.fullName || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('');

  if (user?.photo) {
    return (
      <img
        className={`avatar avatar-photo ${className}`}
        src={user.photo}
        alt={user.fullName || ''}
      />
    );
  }

  return (
    <span
      className={`avatar ${className}`}
      style={{ background: user?.avatarColor || '#47541F' }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
