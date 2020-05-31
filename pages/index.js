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
export default function IndexPage() {
  const [work, setWork] = useState(null);
  const [works, setWorks] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleIdSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const archiveId = data.get("archiveId");
    const workUrl = `https://api.wellcomecollection.org/catalogue/v2/works/${archiveId}?include=collection`;
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
    const worksUrl = `https://api.wellcomecollection.org/catalogue/v2/works?collection.depth=1&query=${query}`;
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
    const workUrl = `https://api.wellcomecollection.org/catalogue/v2/works/${id}?include=collection`;
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
            <p style={{ whiteSpace: "nowrap" }}>
              <label htmlFor="archiveId">Enter archvie id: </label>
              <input id="archiveId" name="archiveId" type="text" />{" "}
              <button>Get the archive</button>
            </p>
          </form>
          OR
          <form onSubmit={handleQuerySubmit}>
            <p style={{ whiteSpace: "nowrap" }}>
              <label htmlFor="query">Search for an archive: </label>
              <input id="query" name="query" type="text" />{" "}
              <button>Look for archives</button>
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
