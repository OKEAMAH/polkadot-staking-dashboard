// Copyright 2022 @paritytech/polkadot-staking-dashboard authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { OpenAssistantIcon } from 'library/OpenAssistantIcon';
import { Button } from 'library/Button';
import React from 'react';
import { Wrapper } from './Wrapper';
import { StatProps } from './types';

export const Stat = (props: StatProps) => {
  const { label, stat, buttons, assistant, icon } = props;

  return (
    <Wrapper>
      <h4>
        {label}
        {assistant.length && <OpenAssistantIcon title={assistant[1]} />}
      </h4>
      <h2 className="stat">
        {icon && (
          <>
            <FontAwesomeIcon icon={icon} transform="shrink-4" />
            &nbsp;
          </>
        )}
        {stat}
        {buttons && (
          <span>
            &nbsp;&nbsp;&nbsp;
            {buttons.map((btn: any, index: number) => (
              <React.Fragment key={`stat_${index}`}>
                <Button
                  key={`btn_${index}_${Math.random()}`}
                  primary
                  inline
                  title={btn.title}
                  small={btn.small ?? undefined}
                  icon={btn.icon ?? undefined}
                  transform={btn.transform ?? undefined}
                  disabled={btn.disabled ?? false}
                  onClick={() => btn.onClick()}
                />
                &nbsp;&nbsp;
              </React.Fragment>
            ))}
          </span>
        )}
      </h2>
    </Wrapper>
  );
};

export default Stat;
