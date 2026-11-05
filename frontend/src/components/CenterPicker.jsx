import { centerMediaName } from '../lib/media.js';
import { gyms } from './MadridMap.jsx';
import { MediaSlot } from './MediaSlot.jsx';
import './CenterPicker.css';

export const CenterPicker = ({ selectedCenter, onChange }) => (
  <section className="dashboard-overview">
    <div className="footprint-grid">
      {gyms.map((gym) => {
        const isSelected = selectedCenter === gym.name;

        return (
          <button
            key={gym.name}
            type="button"
            className={isSelected ? 'footprint-card footprint-card-selected' : 'footprint-card'}
            aria-pressed={isSelected}
            onClick={() => onChange(isSelected ? '' : gym.name)}
          >
            <MediaSlot
              name={centerMediaName(gym.name)}
              kind="image"
              alt={gym.name}
              label={`Foto ${gym.name}`}
              className="footprint-media"
            />
            <span className="eyebrow">{isSelected ? 'Centro elegido' : 'Centro de entrenamiento'}</span>
            <h3>{gym.name}</h3>
            <p>{gym.address}</p>
          </button>
        );
      })}
    </div>
  </section>
);
