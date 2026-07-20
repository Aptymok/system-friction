'use client';

import { useState } from 'react';

type Props = {
  initialName: string;
  onCreated: (phenomenon: any) => void;
  onCancel: () => void;
};

export default function PpoiPhenomenonWizard({
  initialName,
  onCreated,
  onCancel,
}: Props) {

  const [name, setName] = useState(initialName);
  const [isCalibrationCase, setIsCalibrationCase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function createPhenomenon() {

    const normalized =
      name.trim();


    if (!normalized) {
      setError('PHENOMENON_NAME_REQUIRED');
      return;
    }


    setLoading(true);
    setError(null);


    try {

      const response =
        await fetch(
          '/api/ppoi/phenomena',
          {
            method:'POST',
            credentials:'include',
            headers:{
              'Content-Type':'application/json',
            },
            body:JSON.stringify({
              name: normalized,
              isCalibrationCase,
              forceCreate: true,

              initializeProtocol: true,

              baseline: {
                create: true,
                version: 'MIHM-BASELINE-001'
              },

              observationCycle: {
                create: true,
                cycle: 0
              }
            }),
          },
        );


      const data =
        await response.json();



      if(!response.ok || !data.ok){

        throw new Error(
          data.details ??
          data.error ??
          'PPOI_CREATE_FAILED'
        );

      }



      if(
        data.action === 'CREATED' &&
        data.phenomenon
      ){

        onCreated(
          data.phenomenon
        );

        return;

      }



      throw new Error(
        'INVALID_CREATE_RESPONSE'
      );


    } catch(error){

      setError(
        error instanceof Error
          ? error.message
          : 'UNKNOWN_ERROR'
      );

    } finally {

      setLoading(false);

    }

  }



  return (

    <div className="rs-dialog-backdrop">

      <section
        className="rs-dialog"
        role="dialog"
        aria-modal="true"
      >

        <span>
          PPOI PHENOMENON WIZARD
        </span>


        <h2>
          NUEVO EXPEDIENTE FENOMENOLÓGICO
        </h2>


        <label>
          Nombre del fenómeno
        </label>


        <input
          value={name}
          onChange={
            e =>
              setName(e.target.value)
          }
          placeholder="REM618"
        />


        <label className="rs-confirm">

          <input
            type="checkbox"
            checked={isCalibrationCase}
            onChange={
              e =>
                setIsCalibrationCase(
                  e.target.checked
                )
            }
          />

          Caso de calibración

        </label>



        {
          error &&
          (
            <p>
              {error}
            </p>
          )
        }



        <div className="rs-dialog-actions">


          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
          >
            CANCELAR
          </button>



          <button
            type="button"
            onClick={createPhenomenon}
            disabled={loading}
          >
            {
              loading
              ? 'CREANDO...'
              : 'ABRIR EXPEDIENTE'
            }
          </button>


        </div>


      </section>

    </div>

  );

}