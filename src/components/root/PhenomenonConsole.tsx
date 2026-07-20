'use client';

import {
  useCallback,
  useState,
} from 'react';

import type {
  PhenomenonState,
} from '@/lib/ppoi/ppoiTypes';


type Props = {
  state: PhenomenonState;
};



export default function PhenomenonConsole({
  state: initialState,
}: Props) {


  const [
    state,
    setState,
  ] = useState<PhenomenonState>(
    initialState,
  );


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );



  const phenomenon =
    state.phenomenon;



  const refresh =
    useCallback(
      async () => {

        setLoading(true);
        setError(null);


        try {

          const response =
            await fetch(
              `/api/ppoi/phenomena/${phenomenon.id}`,
              {
                cache:'no-store',
                credentials:'include',
              },
            );



          const data =
            await response.json();



          if (
            !response.ok ||
            !data.ok
          ) {

            throw new Error(
              data.error ??
              'PHENOMENON_REFRESH_FAILED',
            );

          }



          setState({
            phenomenon:
              data.phenomenon,

            evidence:
              data.evidence ?? [],

            currentHypothesis:
              data.currentHypothesis ?? null,
          });



        } catch(error) {


          setError(
            error instanceof Error
              ? error.message
              : 'UNKNOWN_ERROR',
          );


        } finally {

          setLoading(false);

        }


      },
      [
        phenomenon.id,
      ],
    );





  async function recalibrate() {

    setLoading(true);
    setError(null);


    try {


      const response =
        await fetch(
          `/api/ppoi/phenomena/${phenomenon.id}`,
          {
            method:'POST',

            credentials:'include',
          },
        );



      const data =
        await response.json();



      if(
        !response.ok ||
        !data.ok
      ){

        throw new Error(
          data.error ??
          'RECALIBRATION_FAILED',
        );

      }



      await refresh();



    } catch(error){


      setError(
        error instanceof Error
          ? error.message
          : 'UNKNOWN_ERROR',
      );


    } finally {


      setLoading(false);


    }

  }





  return (

    <main className="rs-console">


      <header>

        <span>
          PPOI PHENOMENOLOGICAL CASE
        </span>


        <h1>
          {phenomenon.name}
        </h1>


        <p>
          STATUS:{' '}
          {phenomenon.status}
        </p>


      </header>





      <section>

        <h2>
          CURRENT INDICES
        </h2>


        <pre>
          {
            JSON.stringify(
              phenomenon.current_indices,
              null,
              2,
            )
          }
        </pre>



        <strong>
          COMPOSITE:{' '}
          {
            phenomenon.current_composite
              ?? 'N/A'
          }
        </strong>


      </section>





      <section>

        <h2>
          CURRENT HYPOTHESIS
        </h2>


        {
          state.currentHypothesis ? (

            <pre>
              {
                JSON.stringify(
                  state.currentHypothesis,
                  null,
                  2,
                )
              }
            </pre>

          ) : (

            <p>
              NO CURRENT HYPOTHESIS
            </p>

          )
        }


      </section>





      <section>

        <h2>
          EVIDENCE STREAM
        </h2>



        <button
          type="button"
          onClick={recalibrate}
          disabled={loading}
        >

          {
            loading
              ? 'CALIBRATING...'
              : 'RUN RECALIBRATION'
          }


        </button>





        {
          state.evidence.map(
            (
              item,
            ) => (

              <article
                key={item.id}
              >

                <strong>
                  {item.evidence_type}
                </strong>


                <p>
                  SOURCE:
                  {' '}
                  {item.source}
                </p>


                <p>
                  DOMAIN:
                  {' '}
                  {item.domain}
                </p>


                <small>
                  {item.observed_at}
                </small>


              </article>

            ),
          )
        }


      </section>





      {
        error && (

          <section>

            ERROR:
            {' '}
            {error}

          </section>

        )
      }



    </main>

  );

}