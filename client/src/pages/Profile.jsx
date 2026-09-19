import { useState } from 'react';
import { useSession } from '../store.jsx';
import ProfileForm from '../components/ProfileForm.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Profile() {
  const { user, setUser, dictionaries } = useSession();
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <div className="profile-head">
        <Avatar user={user} />
        <div>
          <h1 style={{ fontSize: 20 }}>{user.fullName}</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            {user.position}, {user.company}
          </p>
        </div>
      </div>

      {saved && (
        <div className="notice-box" style={{ marginBottom: 14 }}>
          Профиль сохранён. Подбор пересчитается при следующем открытии ленты.
        </div>
      )}

      <ProfileForm
        user={user}
        dictionaries={dictionaries}
        submitLabel="Сохранить профиль"
        onSaved={(updated) => {
          setUser(updated);
          setSaved(true);
        }}
      />
    </div>
  );
}
