import React, { FunctionComponent, useMemo } from "react";
import usePlaygroundContext from "../../hooks/usePlaygroundContext";
import { ToolbarContainer, ToolbarTitle } from "../Toolbar";
import styles from "./styles.module.scss";
import generateEntries from "./generateEntries";
import Tree from "./Tree";
import DirectoryAction from "./DirectoryAction";

const Sidebar: FunctionComponent = () => {
  const {
    value: { files }
  } = usePlaygroundContext();
  const entries = useMemo(() => generateEntries(Object.keys(files)), [files]);

  return (
    <aside className={styles.container}>
      <ToolbarContainer>
        <ToolbarTitle>Files</ToolbarTitle>
        <div className={styles.toolbarSpacing} />
        <DirectoryAction path="" />
      </ToolbarContainer>
      <div className={styles.treeContainer}>
        <Tree entries={entries} />
      </div>
    </aside>
  );
};

export default Sidebar;
