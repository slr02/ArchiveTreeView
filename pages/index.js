import { useState } from "react";
import fetch from "isomorphic-unfetch";
import ArchiveTree from "../components/ArchiveTree";
import styled from "styled-components";
import Head from "next/head";

const Container = styled.div`
  font-family: Arial, Helvetica, sans-serif;
`;

const FormContainer = styled.div`
  border: 2px solid black;
  border-radius: 6px;
  background: #abebc6;
  padding: 10px;
`;

const ArchiveItem = ({ work, getWork }) => {
  return (
    <li>
      <a
        href="/"
        onClick={e => {
          e.preventDefault();
          getWork(work.id);
        }}
      >
        {work.title}
      </a>
    </li>
  );
};

export const apiUrl = "https://api.wellcomecollection.org/catalogue/v2/works";

export default function IndexPage() {
  const [work, setWork] = useState(null);
  const [works, setWorks] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleIdSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const archiveId = data.get("archiveId");
    const workUrl = `${apiUrl}/${archiveId}?include=collection`;
    if (archiveId.length > 0) {
      const response = await fetch(workUrl);
      const work = await response.json();
      if (work.errorType) {
        setInvalid(true);
        setErrorMessage(work.description);
      } else if (work.collection) {
        setInvalid(false);
        setWork(work);
        setWorks(null);
      } else {
        setInvalid(true);
        setErrorMessage("This work is not an archive");
      }
    } else {
      setInvalid(true);
      setErrorMessage("Please enter an id");
    }
  }

  async function handleQuerySubmit(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const query = data.get("query");
    const worksUrl = `${apiUrl}/?collection.depth=1&query=${query}`;
    if (query.length > 0) {
      const response = await fetch(worksUrl);
      const works = await response.json();
      if (works.type && works.type === "ResultList") {
        setInvalid(false);
        setWorks(works);
        setWork(null);
      } else {
        setInvalid(true);
        setErrorMessage("Something went wrong!");
      }
    } else {
      setInvalid(true);
      setErrorMessage("Please enter a query");
    }
  }

  async function getWork(id) {
    const workUrl = `${apiUrl}/${id}?include=collection`;
    const response = await fetch(workUrl);
    const work = await response.json();
    if (work.errorType) {
      setInvalid(true);
      setErrorMessage(work.description);
    } else if (work.collection) {
      setInvalid(false);
      setWork(work);
      setWorks(null);
    } else {
      setInvalid(true);
      setErrorMessage("This work is not an archive");
    }
  }

  return (
    <>
      <Head>
        <title>View an archive tree from Wellcome Collection</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Container>
        <h1>View an archive tree from Wellcome Collection</h1>
        <FormContainer>
          {invalid && (
            <p style={{ color: "red", fontWeight: "bold" }}>{errorMessage}</p>
          )}
          <form onSubmit={handleIdSubmit}>
            <p>
              <label htmlFor="archiveId">Enter archvie id: </label>
              <span style={{ whiteSpace: "nowrap" }}>
                <input id="archiveId" name="archiveId" type="text" />{" "}
                <button>Go</button>
              </span>
            </p>
          </form>
          OR
          <form onSubmit={handleQuerySubmit}>
            <p>
              <label htmlFor="query">Search for an archive: </label>
              <span style={{ whiteSpace: "nowrap" }}>
                <input id="query" name="query" type="text" />{" "}
                <button>Go</button>
              </span>
            </p>
          </form>
        </FormContainer>
        {works && (
          <>
            <h2>{works.totalResults} Results</h2>
            <ul>
              {works.results.map(work => (
                <ArchiveItem key={work.id} work={work} getWork={getWork} />
              ))}
            </ul>
          </>
        )}
        {work && (
          <>
            <h2>Archive Tree</h2>
            <ArchiveTree work={work} />
          </>
        )}
      </Container>
    </>
  );
}

//cbjzx6u8 //hz43r7re
