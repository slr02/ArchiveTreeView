import { useState, useRef, useEffect } from "react";
import fetch from "isomorphic-unfetch";
import styled from "styled-components";
import useOnScreen from "../hooks/useOnScreen";
import { apiUrl } from "../pages/index";

const ItemLink = styled.a`
  margin-top: 5px;
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 12px;
  color: #fff;
  background: #007868;
  border-radius: 6px;
  text-decoration: none;
  transition: background 300ms ease;

  &:hover,
  &:focus {
    text-decoration: none;
    background: #333;
  }

  .icon__shape {
    fill: currentColor;
  }
`;

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
    :hover,
    :focus {
      text-decoration: underline;
    }
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

  a {
    text-decoration: none;
  }

  a:focus,
  a:hover {
    text-decoration: underline;
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
  "subjects",
  "genres",
  "contributors",
  "production",
  "notes"
];

async function getWork(id, withIncludes = false) {
  const workUrl = `${apiUrl}/${id}?include=collection,items${
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
  currentBranchWithChildren,
  itemUrl
) {
  const collectionCopy = Object.assign({}, collection);
  for (const property in collectionCopy) {
    if (property === "children") {
      for (const child of collectionCopy[property]) {
        if (currentWorkPath.includes(child.path.path)) {
          if (child.path.path === currentWorkPath) {
            child.children = currentBranchWithChildren.children;
            child.itemUrl = itemUrl;
          } else {
            updateCollection(
              child,
              currentWorkPath,
              currentBranchWithChildren,
              itemUrl
            );
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
    console.log(work.items);
    setWorkToPreview(work);
    setShowPreview(true);
  }

  function getDigitalLocationOfType(work, locationType) {
    const [item] =
      work.items &&
      work.items
        .map(item =>
          item.locations.find(
            location => location.locationType.id === locationType
          )
        )
        .filter(Boolean);
    return item;
  }

  const fetchAndUpdateCollection = async id => {
    // if (level === "Item") return; // TODO just for testing online idea
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
      const digitalLocation = getDigitalLocationOfType(
        currentWork,
        "iiif-presentation"
      );
      const sierraId =
        digitalLocation &&
        (digitalLocation.url.match(/iiif\/(.*)\/manifest/) || [])[1];
      const itemUrl = `https://wellcomecollection.org/works/${
        currentWork.id
      }/items?canvas=1&sierraId=${sierraId}`;
      const updatedCollection = updateCollection(
        collection,
        currentWorkPath,
        currentBranchWithChildren,
        sierraId && itemUrl
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
        display: "inline-block",
        color: "black"
      }}
      ref={ref}
      target="_blank"
      rel="noopener noreferrer"
      href={`https://wellcomecollection.org/works/${id}`}
      onClick={showPreview}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <span>{title}</span>
        <span
          style={{
            display: "inline-block",
            width: "1em",
            padding: "0",
            marginLeft: "2px"
          }}
        >
          <svg viewBox="0 0 24 24">
            <path
              class="icon__shape"
              fill-rule="nonzero"
              d="M18.791 11.506l-5.224-5.294a.667.667 0 0 0-.975 0 .689.689 0 0 0 0 .988l4.04 4.094H5.697c-.418 0-.697.282-.697.706s.279.706.697.706h10.935l-4.04 4.094a.689.689 0 0 0 0 .988c.14.141.348.212.488.212.139 0 .348-.07.487-.212l5.224-5.294a.689.689 0 0 0 0-.988z"
            />
          </svg>
        </span>
      </span>
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
            <div style={{ padding: "10px 10px 30px" }}>
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
              {item.itemUrl && (
                <>
                  <br />
                  <ItemLink
                    href={item.itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "1.5em",
                        padding: "0",
                        marginRight: "5px"
                      }}
                    >
                      <svg viewBox="0 0 24 24">
                        <g
                          class="icon__shape"
                          fill-rule="nonzero"
                          transform="translate(2 4)"
                        >
                          <path d="M10 0C4.17 0 0 6 0 8s4 8 10 8 10-6 10-8-4.2-8-10-8zm0 14c-4.76 0-8-5-8-6s3.21-6 8-6 8 5.11 8 6c0 .89-3.24 6-8 6z" />
                          <circle cx="9.97" cy="8" r="3" />
                        </g>
                      </svg>
                    </span>
                    View online
                  </ItemLink>
                </>
              )}
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
            </div>
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
            <tbody>
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
            </tbody>
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
