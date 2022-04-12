import React from 'react';
import classes from './Row.module.scss';


type Props = {
    children: any;
}
export const Row: React.FC<Props> = ({children}) => {
    return (
        <div className={classes.Row}>
            {children}
        </div>
    );
};