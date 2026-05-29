import * as path from "path";

import * as React from "react";
import {
  Button as BSButton,
  ControlLabel,
  FormControl,
  FormGroup,
  HelpBlock,
  InputGroup,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { useMainContext } from "../../../contexts/MainContext";
import Icon from "../../../controls/Icon";
import { Button } from "../../../controls/TooltipControls";
import type { IState } from "../../../types/IState";
import * as fs from "../../../util/fs";
import { activeGameId } from "../../../util/selectors";
import { setWinePrefixPath } from "../actions/settings";
import { currentGameDiscovery } from "../selectors";

type ValidationState = "success" | "warning" | undefined;

function validatePrefixPath(prefixPath: string): PromiseLike<ValidationState> {
  if (prefixPath.trim() === "") {
    return Promise.resolve(undefined);
  }

  return fs
    .statAsync(path.join(prefixPath, "drive_c"))
    .then(() => "success" as ValidationState)
    .catch(() => "warning" as ValidationState);
}

const WinePrefixSettings: React.FC = () => {
  const { t } = useTranslation(["common"]);
  const { api } = useMainContext();
  const dispatch = useDispatch();
  const gameId = useSelector(activeGameId);
  const discovery = useSelector((state: IState) => currentGameDiscovery(state));
  const storedPrefix = discovery?.winePrefixPath ?? "";
  const [prefixPath, setPrefixPath] = React.useState(storedPrefix);
  const [validationState, setValidationState] = React.useState<ValidationState>(undefined);

  React.useEffect(() => {
    setPrefixPath(storedPrefix);
  }, [storedPrefix]);

  React.useEffect(() => {
    let canceled = false;
    validatePrefixPath(prefixPath).then((state) => {
      if (!canceled) {
        setValidationState(state);
      }
    });
    return () => {
      canceled = true;
    };
  }, [prefixPath]);

  const changed = prefixPath !== storedPrefix;

  const apply = React.useCallback(() => {
    if (gameId === undefined) {
      return;
    }
    dispatch(setWinePrefixPath(gameId, prefixPath.trim() || undefined));
  }, [dispatch, gameId, prefixPath]);

  const browse = React.useCallback(() => {
    const defaultPath = prefixPath || storedPrefix || discovery?.path;
    api.selectDir(defaultPath !== undefined ? { defaultPath } : {}).then((selectedPath: string) => {
      if (selectedPath !== undefined) {
        setPrefixPath(selectedPath);
        if (gameId !== undefined) {
          dispatch(setWinePrefixPath(gameId, selectedPath));
        }
      }
    });
  }, [api, discovery?.path, dispatch, gameId, prefixPath, storedPrefix]);

  const clear = React.useCallback(() => {
    setPrefixPath("");
    if (gameId !== undefined) {
      dispatch(setWinePrefixPath(gameId, undefined));
    }
  }, [dispatch, gameId]);

  const onChange = React.useCallback((evt: React.FormEvent<FormControl>) => {
    if (evt.target instanceof HTMLInputElement) {
      setPrefixPath(evt.target.value);
    }
  }, []);

  const onKeyPress = React.useCallback(
    (evt: React.KeyboardEvent<FormControl>) => {
      if (evt.key === "Enter" && changed) {
        evt.preventDefault();
        apply();
      }
    },
    [apply, changed],
  );

  return (
    <FormGroup validationState={validationState}>
      <ControlLabel>{t("Wine Prefix Path")}</ControlLabel>
      <InputGroup>
        <FormControl
          placeholder={t("Path to Wine or Proton prefix")}
          type="text"
          value={prefixPath}
          onChange={onChange}
          onKeyPress={onKeyPress}
        />
        <InputGroup.Button className="inset-btn">
          <Button tooltip={t("Browse")} onClick={browse}>
            <Icon name="browse" />
          </Button>
        </InputGroup.Button>
        <InputGroup.Button>
          <BSButton disabled={!changed} onClick={apply}>
            {t("Apply")}
          </BSButton>
          <BSButton disabled={storedPrefix === "" && prefixPath === ""} onClick={clear}>
            {t("Clear")}
          </BSButton>
        </InputGroup.Button>
      </InputGroup>
      <HelpBlock>
        {t(
          "Path to the Wine/Proton prefix for this game. Required for correct plugin load order and INI settings. Auto-detected for Steam games.",
        )}
      </HelpBlock>
      {validationState === "warning" ? (
        <ControlLabel>
          {t(
            "This directory does not look like a Wine prefix because it does not contain drive_c.",
          )}
        </ControlLabel>
      ) : null}
    </FormGroup>
  );
};

export default WinePrefixSettings;
