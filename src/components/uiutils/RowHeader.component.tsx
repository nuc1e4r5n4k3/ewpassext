import React from "react";
import classes from './RowHeader.module.scss';


type Props = {
    value?: string;
    children?: any;
}
export const RowHeader: React.FC<Props> = ({value, children}) => {
    return (
        <div className={classes.RowHeader}>
            {value}
            {children}
        </div>
    );
};