import { useNavigate } from 'react-router-dom';
import { useSession } from '../store.jsx';
import ProfileForm from '../components/ProfileForm.jsx';

export default function Onboarding() {
  const { user, setUser, dictionaries } = useSession();
  const navigate = useNavigate();

  return (
    <div className="shell-main" style={{ paddingTop: 28 }}>
      <div className="page-head">
        <h1>Соберём ваш профиль</h1>
        <p>
          {user.fullName}, данные компании подтянуты из СберБизнес ID. Осталось описать бизнес и
          запрос — ИИ будет искать по ним.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="candidate-facts" style={{ display: 'grid' }}>
          <dt className="muted">Компания</dt>
          <dd>{user.company}</dd>
          <dt className="muted">Должность</dt>
          <dd>{user.position}</dd>
          <dt className="muted">ИНН</dt>
          <dd>{user.inn}</dd>
        </div>
      </div>

      <ProfileForm
        user={user}
        dictionaries={dictionaries}
        submitLabel="Перейти к подбору"
        onSaved={(updated) => {
          setUser(updated);
          navigate('/', { replace: true });
        }}
      />
    </div>
  );
}
