import './LegalPage.css';

const contactEmail = 'info@noxfit.es';
const lastUpdated = '28 de octubre de 2026';

const pages = {
  privacidad: {
    title: 'Política de privacidad',
    intro: 'En Noxfit tratamos tus datos personales con transparencia y conforme al Reglamento (UE) 2016/679 (RGPD) y la LOPDGDD.',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        body: [
          `Noxfit es la responsable del tratamiento de los datos recogidos a través de esta plataforma. Puedes contactar con nosotros en ${contactEmail}.`,
        ],
      },
      {
        heading: '2. Datos que recogemos',
        list: [
          'Datos de cuenta: nombre completo, correo electrónico y contraseña (almacenada cifrada).',
          'Datos de la membresía: plan contratado, fecha de alta y estado de la cuenta.',
          'Datos de uso: reservas de clases (actividad, fecha, hora, centro y entrenador).',
          'Foto de perfil, únicamente si decides subirla.',
        ],
      },
      {
        heading: '3. Finalidad y base legal',
        list: [
          'Gestionar tu cuenta y tu membresía (ejecución del contrato).',
          'Gestionar reservas y evitar conflictos de horarios (ejecución del contrato).',
          'Enviar correos de servicio, como la recuperación de contraseña (ejecución del contrato).',
          'Garantizar la seguridad de la plataforma (interés legítimo).',
        ],
      },
      {
        heading: '4. Conservación',
        body: [
          'Conservamos tus datos mientras mantengas tu cuenta activa. Tras la baja, los bloqueamos durante los plazos legales aplicables y después los eliminamos.',
        ],
      },
      {
        heading: '5. Destinatarios',
        body: [
          'No vendemos tus datos. Solo accederán a ellos los entrenadores y administradores de Noxfit necesarios para prestar el servicio, y los proveedores técnicos que actúan como encargados del tratamiento (alojamiento y envío de correo).',
        ],
      },
      {
        heading: '6. Tus derechos',
        body: [
          `Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${contactEmail}. Si consideras que no hemos atendido tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).`,
        ],
      },
    ],
  },
  terminos: {
    title: 'Términos y condiciones',
    intro: 'Al registrarte y usar Noxfit aceptas estos términos. Léelos con atención antes de usar el servicio.',
    sections: [
      {
        heading: '1. Objeto',
        body: [
          'Estos términos regulan el acceso y uso de la plataforma Noxfit para gestionar tu membresía y reservar clases y sesiones con entrenadores en nuestros centros.',
        ],
      },
      {
        heading: '2. Cuenta de usuario',
        list: [
          'Debes facilitar datos veraces y mantenerlos actualizados.',
          'Eres responsable de custodiar tus credenciales y de la actividad realizada con tu cuenta.',
          'Avísanos de inmediato si detectas un uso no autorizado.',
        ],
      },
      {
        heading: '3. Membresías y cuotas',
        body: [
          'Los planes disponibles y sus cuotas se muestran en la plataforma. Noxfit puede modificar las tarifas comunicándolo con antelación razonable.',
        ],
      },
      {
        heading: '4. Reservas',
        list: [
          'Las reservas están sujetas a la disponibilidad del entrenador y del centro.',
          'No es posible reservar dos sesiones en el mismo horario.',
          'Puedes cancelar una reserva desde la plataforma. Noxfit puede reprogramar o cancelar sesiones por causas justificadas.',
        ],
      },
      {
        heading: '5. Uso adecuado',
        body: [
          'Te comprometes a no usar la plataforma con fines ilícitos, a no intentar acceder a datos de otros usuarios y a respetar al personal y a los demás socios. El incumplimiento puede conllevar la suspensión de la cuenta.',
        ],
      },
      {
        heading: '6. Salud y responsabilidad',
        body: [
          'La actividad física conlleva riesgos. Declaras encontrarte en condiciones físicas adecuadas y te recomendamos consultar con un profesional médico antes de iniciar un programa de entrenamiento.',
        ],
      },
      {
        heading: '7. Propiedad intelectual',
        body: [
          'Los contenidos, marca y diseño de Noxfit son de su titular y no pueden reproducirse sin autorización.',
        ],
      },
      {
        heading: '8. Legislación aplicable',
        body: [
          'Estos términos se rigen por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan conforme a la normativa de consumidores.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Política de cookies',
    intro: 'Te explicamos qué tecnologías de almacenamiento usa Noxfit y con qué finalidad.',
    sections: [
      {
        heading: '1. Qué son las cookies',
        body: [
          'Las cookies y tecnologías similares (como el almacenamiento local del navegador) permiten guardar información en tu dispositivo para el funcionamiento del sitio.',
        ],
      },
      {
        heading: '2. Qué usamos',
        list: [
          'Almacenamiento local (noxfit.session): guarda tu sesión iniciada para que no tengas que identificarte en cada visita. Es estrictamente necesario y se elimina al cerrar sesión.',
          'No utilizamos cookies propias de analítica, publicidad ni seguimiento.',
        ],
      },
      {
        heading: '3. Servicios de terceros',
        list: [
          'Google Fonts: carga las tipografías de la web, lo que implica una petición a servidores de Google.',
          'OpenStreetMap: proporciona los mapas de nuestros centros, lo que implica una petición a sus servidores de teselas.',
        ],
        body: [
          'Estos proveedores pueden recibir tu dirección IP al servir el contenido. Consulta sus políticas de privacidad para más información.',
        ],
      },
      {
        heading: '4. Cómo gestionarlas',
        body: [
          'Puedes borrar o bloquear el almacenamiento local y las cookies desde la configuración de tu navegador. Si eliminas la sesión guardada, tendrás que volver a iniciar sesión.',
        ],
      },
      {
        heading: '5. Contacto',
        body: [`Para cualquier duda sobre esta política escríbenos a ${contactEmail}.`],
      },
    ],
  },
};

export const legalRoutes = Object.keys(pages);

export const LegalPage = ({ page, onBack }) => {
  const content = pages[page];

  return (
    <main className="page legal-page">
      <button className="button button-secondary legal-back" type="button" onClick={onBack}>
        Volver
      </button>

      <article className="legal-card">
        <div className="eyebrow eyebrow-accent">NOXFIT</div>
        <h1>{content.title}</h1>
        <p className="legal-updated">Última actualización: {lastUpdated}</p>
        <p>{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.list ? (
              <ul>
                {section.list.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </section>
        ))}

        <nav className="legal-links" aria-label="Documentos legales">
          {legalRoutes.filter((route) => route !== page).map((route) => (
            <a key={route} href={`#${route}`}>{pages[route].title}</a>
          ))}
        </nav>
      </article>
    </main>
  );
};
