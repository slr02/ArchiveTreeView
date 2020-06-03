import { useState, useRef, useEffect } from "react";
import fetch from "isomorphic-unfetch";
import styled from "styled-components";
import useOnScreen from "../hooks/useOnScreen";
import { apiUrl } from "../pages/index";

const Preview = styled.div`
  font-size: 14px;
  position: fixed;
  z-index: 2;
  top: 50%;
  transform: translateY(-50%);
  right: 20px;
  box-sizing: border-box;
  width: 50vw;
  max-height: calc(100vh - 48px);
  overflow: auto;
  border: 2px solid black;
  border-radius: 6px;
  background: #f0ede3;
  padding: 12px;

  p {
    margin-top: 0;
  }

  a {
    color: black;
  }

  button {
    position: absolute;
    top: 12px;
    right: 12px;
  }
`;

const PreviewTable = styled.table`
  margin-top: 30px;
  th,
  td {
    padding: 6px;
    vertical-align: top;
    text-align: left;
  }
`;
const Tree = styled.div`
  ul {
    list-style: none;
    padding-left: 0;
    margin-left: 0;
  }

  li {
    position: relative;
    list-style: none;
    font-weight: bold;
  }

  span {
    text-decoration: none;
    display: inline-block;
    padding: 10px;
    white-space: nowrap;
    :hover,
    :focus {
      text-decoration: underline;
    }
  }

  ul ul {
    padding-left: 62px;

    li {
      font-weight: normal;
    }

    li::before,
    li::after {
      content: "";
      position: absolute;
      left: -22px;
    }

    li::before {
      border-top: 2px solid black;
      top: 20px;
      width: 22px;
      height: 0;
    }

    li::after {
      border-left: 2px solid black;
      height: 100%;
      width: 0px;
      top: 10px;
    }

    li:last-child::after {
      height: 10px;
    }
  }
`;

const includes = [
  "identifiers",
  "items",
  "subjects",
  "genres",
  "contributors",
  "production",
  "notes"
];

async function getWork(id, withIncludes = false) {
  const workUrl = `${apiUrl}/${id}?include=collection${
    withIncludes ? `,${includes.join(",")}` : ""
  }`;
  const response = await fetch(workUrl);
  const work = await response.json();
  return work;
}

function getTreeBranches(path, collection) {
  const pathParts = path.split("/"); // ['PPCRI', 'A', '1', '1']
  const pathsToChildren = pathParts
    .reduce((acc, curr, index) => {
      if (index === 0) return [pathParts[0]];

      return [...acc, `${acc[index - 1]}/${curr}`];
    }, [])
    .slice(1); // ['PPCRI/A', 'PPCRI/A/1', 'PPCRI/A/1/1']

  return pathsToChildren.reduce(
    (acc, curr) => {
      const foundItem =
        (acc[0].children && acc[0].children.find(i => i.path.path === curr)) ||
        {};

      return [
        {
          work: foundItem.work,
          path: foundItem.path,
          children: foundItem.children
        },
        ...acc
      ];
    },
    [
      {
        work: collection.work,
        path: collection.path,
        children: collection.children
      }
    ]
  );
}

function updateCollection(
  collection,
  currentWorkPath,
  currentBranchWithChildren
) {
  const collectionCopy = Object.assign({}, collection);
  for (const property in collectionCopy) {
    if (property === "children") {
      for (const child of collectionCopy[property]) {
        if (currentWorkPath.includes(child.path.path)) {
          if (child.path.path === currentWorkPath) {
            child.children = currentBranchWithChildren.children;
          } else {
            updateCollection(child, currentWorkPath, currentBranchWithChildren);
          }
        }
      }
    }
  }
  return collectionCopy;
}

const WorkLink = ({
  title,
  id,
  level,
  currentWorkPath,
  collection,
  setCollection,
  setWorkToPreview,
  setShowPreview
}) => {
  const ref = useRef();
  const isOnScreen = useOnScreen({
    ref: ref,
    threshold: [0]
  });

  async function showPreview(e) {
    e.preventDefault();
    const work = await getWork(id, true);
    setWorkToPreview(work);
    setShowPreview(true);
  }
  const fetchAndUpdateCollection = async id => {
    if (level === "Item") return;
    // find the current branch
    const currentBranch = getTreeBranches(currentWorkPath, collection)[0];
    // check for children
    if (!currentBranch.children) {
      // if no children then get collection tree for work
      const currentWork = await getWork(id);
      const newCollection = currentWork.collection;
      const currentBranchWithChildren = getTreeBranches(
        currentWorkPath,
        newCollection
      )[0];
      const updatedCollection = updateCollection(
        collection,
        currentWorkPath,
        currentBranchWithChildren
      );
      setCollection(updatedCollection);
    }
  };
  useEffect(() => {
    if (isOnScreen) {
      fetchAndUpdateCollection(id);
    }
  }, [isOnScreen]);

  return (
    <a
      style={{
        whiteSpace: "nowrap",
        padding: "10px",
        display: "inline-block",
        color: "black",
        textDecoration: "none"
      }}
      ref={ref}
      target="_blank"
      rel="noopener noreferrer"
      href={`https://wellcomecollection.org/works/${id}`}
      onClick={showPreview}
    >
      {title}
      <br />
      <span
        style={{
          fontSize: "13px",
          color: "#707070",
          textDecoration: "none",
          padding: "0"
        }}
      >
        {currentWorkPath}
      </span>
    </a>
  );
};

const NestedList = ({
  children,
  currentWorkId,
  collection,
  setCollection,
  setWorkToPreview,
  setShowPreview
}) => {
  return (
    <ul>
      {children.map(item => {
        return (
          <li key={item.work.id}>
            <WorkLink
              title={item.work.title}
              id={item.work.id}
              currentWorkPath={item.path.path}
              level={item.path.level}
              collection={collection}
              setCollection={setCollection}
              setWorkToPreview={setWorkToPreview}
              setShowPreview={setShowPreview}
            />
            {item.children && (
              <NestedList
                currentWorkPath={item.path.path}
                children={item.children}
                currentWorkId={currentWorkId}
                collection={collection}
                setCollection={setCollection}
                setWorkToPreview={setWorkToPreview}
                setShowPreview={setShowPreview}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};

const ArchiveTree = ({ work }) => {
  const [collectionTree, setCollectionTree] = useState(work.collection || {});
  const [workToPreview, setWorkToPreview] = useState();
  const [showPreview, setShowPreview] = useState();
  useEffect(() => {
    setCollectionTree(work.collection);
  }, [work]);
  return (
    <>
      {showPreview && workToPreview && (
        <Preview>
          <button onClick={() => setShowPreview(false)}>Close Preview</button>
          <PreviewTable>
            {workToPreview.title && (
              <tr>
                <th>Title:</th>
                <td>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://wellcomecollection.org/works/${work.id}`}
                  >
                    {workToPreview.title}
                  </a>
                </td>
              </tr>
            )}
            {workToPreview.collectionPath && (
              <tr>
                <th>Reference:</th>
                <td>{workToPreview.collectionPath.path}</td>
              </tr>
            )}
            {workToPreview.description && (
              <tr>
                <th>Description:</th>
                <td>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: workToPreview.description
                    }}
                  />
                </td>
              </tr>
            )}
            {workToPreview.production && workToPreview.production.length > 0 && (
              <tr>
                <th>Publication/Creation</th>
                <td>
                  {workToPreview.production.map(
                    productionEvent => productionEvent.label
                  )}
                </td>
              </tr>
            )}
            {workToPreview.physicalDescription && (
              <tr>
                <th>Physical description:</th>
                <td>{workToPreview.physicalDescription}</td>
              </tr>
            )}
            {workToPreview.notes &&
              workToPreview.notes
                .filter(note => note.noteType.label === "Copyright note")
                .map(note => (
                  <tr key={note.noteType.label}>
                    <th>{note.noteType.label}</th>
                    <td>{note.contents}</td>
                  </tr>
                ))}
          </PreviewTable>
        </Preview>
      )}
      <Tree>
        <NestedList
          currentWorkPath={work.collectionPath.path}
          currentWorkId={work.id}
          children={[collectionTree]}
          collection={collectionTree}
          setCollection={setCollectionTree}
          setWorkToPreview={setWorkToPreview}
          setShowPreview={setShowPreview}
        />
      </Tree>
    </>
  );
};
export default ArchiveTree;
// TODO highlight tree node for work id used to generate it
// TODO useContext rather than passing props down (showPreviewEtc)
// TODO split this file up
// TODO use same getWork function everywhere
// TODO use react window
// TODO prevent scroll when loading?
// TODO icon when loading
// TODO use INDEXDB to store works, so don't have to get them if already have
// TODO Change Tree / grow Tree option
// TODO show/hide branch controls
// TODO Get examples of digitised archives
