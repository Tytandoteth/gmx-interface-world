import "./EventToast.css";
import { Toast } from "react-hot-toast";
import { MdOutlineClose } from "react-icons/md";

import { EventData } from "config/events";

import ExternalLink from "components/ExternalLink/ExternalLink";

import Icon from "./AnnouncementIcon";

export default function EventToast({
  event,
  id,
  onClick,
  toast,
}: {
  event: EventData;
  id: string;
  onClick: () => void;
  toast: Toast;
}) {
  return (
    <div data-qa="toast" className={`single-toast ${toast.visible ? "zoomIn" : "zoomOut"}`} key={id}>
      <header>
        <div className="toast-title">
          <Icon className="announcement-icon" />
          <p>{event.title}</p>
        </div>
        <MdOutlineClose onClick={onClick} className="cross-icon" color="white" data-qa="close-toast" />
      </header>
      {Array.isArray(event.bodyText) ? (
        event.bodyText.map((text, i) =>
          text === "" ? (
            <br key={i} />
          ) : (
            <p key={i} className="toast-body">
              {text}
            </p>
          )
        )
      ) : (
        <p className="toast-body">{event.bodyText}</p>
      )}
      {event.link && (
        <div className="toast-links">
          <ExternalLink key={event.id + event.link.text} href={event.link.href} newTab={event.link?.newTab ?? false}>
            {event.link.text}
          </ExternalLink>
          .
        </div>
      )}
    </div>
  );
}
