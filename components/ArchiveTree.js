import { useState, useRef, useEffect } from "react";
import fetch from "isomorphic-unfetch";
import styled from "styled-components";
import useOnScreen from "../hooks/useOnScreen";

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

async function getWork(id) {
  const url = `https://api.wellcomecollection.org/catalogue/v2/works/${id}?include=collection`;
  const response = await fetch(url);
  const work = await response.json();
  return {
    work
  };
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
  setCollection
}) => {
  const ref = useRef();
  const isOnScreen = useOnScreen({
    ref: ref,
    threshold: [0]
  });

  const fetchAndUpdateCollection = async id => {
    // find the current branch
    const currentBranch = getTreeBranches(currentWorkPath, collection)[0];
    // check for children
    if (!currentBranch.children) {
      // if no children then get collection tree for work
      const currentWork = await getWork(id);
      const newCollection = currentWork.work.collection;
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
      style={{ whiteSpace: "nowrap", padding: "10px", display: "inline-block" }}
      ref={ref}
      target="_blank"
      rel="noopener noreferrer"
      href={`https://wellcomecollection.org/works/${id}`}
    >
      {`${title} (${currentWorkPath})`}
    </a>
  );
};

const NestedList = ({ children, currentWorkId, collection, setCollection }) => {
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
            />
            {item.children && (
              <NestedList
                currentWorkPath={item.path.path}
                children={item.children}
                currentWorkId={currentWorkId}
                collection={collection}
                setCollection={setCollection}
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
  useEffect(() => {
    setCollectionTree(work.collection);
  }, [work]);
  return (
    <Tree>
      <NestedList
        currentWorkPath={work.collectionPath.path}
        currentWorkId={work.id}
        children={[collectionTree]}
        collection={collectionTree}
        setCollection={setCollectionTree}
      />
    </Tree>
  );
};
export default ArchiveTree;
// Needs API working
// Click tree node to show preview, link from preview to view work on wellcomecollection.org
// TODO prevent scroll when loading?
// TODO icon when loading
// TODO use react window
// TODO split this file up
// Change Tree / grow Tree option
