import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Manage from 'components/pages/Manage';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function ManagePage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  return (
    <>
      <Head>
        <title>{props.title} - Manage User</title>
      </Head>
      <Layout props={props}>
        <Manage />
      </Layout>
    </>
  );
}
