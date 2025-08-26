--
-- PostgreSQL database dump
--

\restrict QPDEeeidxYTBNVueQiSvYo8FuKKKZsYDodjqNEhtivnPBbOlMdU0InPFRKeQgbm

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: CrawlSession; Type: TABLE; Schema: public; Owner: brianviglianco
--

CREATE TABLE public."CrawlSession" (
    id text NOT NULL,
    "domainId" text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "screenshotPath" text,
    "harPath" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public."CrawlSession" OWNER TO brianviglianco;

--
-- Name: Domain; Type: TABLE; Schema: public; Owner: brianviglianco
--

CREATE TABLE public."Domain" (
    id text NOT NULL,
    url text NOT NULL,
    name text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Domain" OWNER TO brianviglianco;

--
-- Name: User; Type: TABLE; Schema: public; Owner: brianviglianco
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO brianviglianco;

--
-- Name: Violation; Type: TABLE; Schema: public; Owner: brianviglianco
--

CREATE TABLE public."Violation" (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    severity text NOT NULL,
    evidence text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Violation" OWNER TO brianviglianco;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: brianviglianco
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO brianviglianco;

--
-- Data for Name: CrawlSession; Type: TABLE DATA; Schema: public; Owner: brianviglianco
--

COPY public."CrawlSession" (id, "domainId", status, "screenshotPath", "harPath", "createdAt", "completedAt") FROM stdin;
\.


--
-- Data for Name: Domain; Type: TABLE DATA; Schema: public; Owner: brianviglianco
--

COPY public."Domain" (id, url, name, "userId", "createdAt", "updatedAt") FROM stdin;
cmekisuol0001raqcn1d9yyhq	https://google.com	Google	cmekiic840000rabluccrp0rk	2025-08-20 22:04:25.557	2025-08-20 22:04:25.557
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: brianviglianco
--

COPY public."User" (id, email, password, name, "createdAt", "updatedAt") FROM stdin;
cmekiic840000rabluccrp0rk	brian@spectral.com	$2b$10$jWy1xUjVWg235wTdIFSbZ.zz6cuBDAVdqY7KPqvwZKgwPslHl2fKm	Brian	2025-08-20 21:56:15.077	2025-08-20 21:56:15.077
\.


--
-- Data for Name: Violation; Type: TABLE DATA; Schema: public; Owner: brianviglianco
--

COPY public."Violation" (id, "sessionId", type, description, severity, evidence, "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: brianviglianco
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
529b36da-656b-4e86-be7d-5ec06b7a4fc9	3c000cebb6af149a36b2a689f3bdb5a6eea70a77dc9ab8ed9312be01b12c5ebb	2025-08-20 18:04:20.713891-03	20250820210420_init	\N	\N	2025-08-20 18:04:20.708314-03	1
\.


--
-- Name: CrawlSession CrawlSession_pkey; Type: CONSTRAINT; Schema: public; Owner: brianviglianco
--

ALTER TABLE ONLY public."CrawlSession"
    ADD CONSTRAINT "CrawlSession_pkey" PRIMARY KEY (id);


--
-- Name: Domain Domain_pkey; Type: CONSTRAINT; Schema: public; Owner: brianviglianco
--

ALTER TABLE ONLY public."Domain"
    ADD CONSTRAINT "Domain_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: brianviglianco
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Violation Violation_pkey; Type: CONSTRAINT; Schema: public; Owner: brianviglianco
--

ALTER TABLE ONLY public."Violation"
    ADD CONSTRAINT "Violation_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: brianviglianco
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: brianviglianco
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: CrawlSession CrawlSession_domainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brianviglianco
--

ALTER TABLE ONLY public."CrawlSession"
    ADD CONSTRAINT "CrawlSession_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES public."Domain"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Domain Domain_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brianviglianco
--

ALTER TABLE ONLY public."Domain"
    ADD CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Violation Violation_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: brianviglianco
--

ALTER TABLE ONLY public."Violation"
    ADD CONSTRAINT "Violation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."CrawlSession"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict QPDEeeidxYTBNVueQiSvYo8FuKKKZsYDodjqNEhtivnPBbOlMdU0InPFRKeQgbm

