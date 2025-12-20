type UiCheckLogin = {
  type: "check-login";
};

type UiSave = {
  type: "save";
  identifier: string;
  password: string;
};

export type UiMessageType = UiCheckLogin | UiSave;

type InfoType = {
  type: "info";
  identifier: string;
  password: string;
  isLoggedIn: boolean;
};

export type MessageType = InfoType;
