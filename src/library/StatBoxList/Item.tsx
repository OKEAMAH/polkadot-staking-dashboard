// Copyright 2022 @rossbulat/polkadot-staking-experience authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { StatBoxWrapper } from './Wrapper';
import NumberEasing from 'che-react-number-easing';
import { StatBoxPie } from '../../library/Graphs/StatBoxPie';

export const Item = (props: any) => {

  const { label, value, value2, total, unit, format, tooltip } = props;
  let currency = props.currency ?? '';

  let showValue = !(value === 0 && total !== 0);
  let showTotal = !(total === undefined || !total);

  return (
    <StatBoxWrapper
      whileHover={{ scale: 1.02 }}
      transition={{
        duration: 0.5,
        type: "spring",
        bounce: 0.4,
      }}
    >
      <div className='content chart'>
        {format === 'chart' &&
          <div className='chart'>
            <StatBoxPie
              value={value}
              value2={value2}
            />
            {tooltip &&
              <div className='tooltip'>
                <p>{tooltip}</p>
              </div>
            }
          </div>
        }
        <div className='labels'>
          {format === 'number' &&
            <>
              <h2>
                <NumberEasing
                  ease="quintInOut"
                  precision={2}
                  speed={250}
                  trail={false}
                  value={value}
                  useLocaleString={true}
                  currency={currency}
                />
                &nbsp;{unit}
              </h2>
              <h4>{label}</h4>
            </>
          }
          {format === 'text' &&
            <>
              <h1>{value}</h1>
              <h4>{label}</h4>
            </>
          }
          {format === 'chart' &&
            <>
              <h2>
                {showValue
                  ?
                  <>
                    <NumberEasing
                      ease="quintInOut"
                      precision={2}
                      speed={250}
                      trail={false}
                      value={value}
                      useLocaleString={true}
                    /> {unit && <>&nbsp;{unit}</>}

                    {showTotal &&
                      <span className='total'>
                        / <NumberEasing
                          ease="quintInOut"
                          precision={2}
                          speed={250}
                          trail={false}
                          value={total}
                          useLocaleString={true}
                        />
                      </span>
                    }
                  </>
                  : <>0</>
                }
              </h2>
              <h4>{label}</h4>
            </>
          }
        </div>
      </div>
    </StatBoxWrapper>
  )
}

export default Item;